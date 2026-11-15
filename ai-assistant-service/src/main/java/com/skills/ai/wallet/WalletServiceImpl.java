package com.skills.ai.wallet;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Distributed, relational PostgreSQL-backed implementation of WalletService managing CineMind's Fintech Digital Wallet (CineCash).
 * Enforces ACID transaction boundaries, pessimistic row-level locking (SELECT FOR UPDATE) to eliminate race conditions
 * and double-spending across distributed clusters, with distributed Redis balance caching and an immutable audit trail.
 */
@Slf4j
@Service
public class WalletServiceImpl implements WalletService {

    private static final String DEFAULT_WALLET_ID = "WLT-CINEMIND-8842";
    private static final String REDIS_BALANCE_KEY = "cinemind:wallet:balance:" + DEFAULT_WALLET_ID;

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;

    // Fallback in-memory state used only if jdbcTemplate is not configured (e.g. lightweight unit tests)
    private final AtomicReference<Double> fallbackBalance = new AtomicReference<>(150.00);
    private final List<WalletTransaction> fallbackTransactions = Collections.synchronizedList(new ArrayList<>());

    public WalletServiceImpl(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            @Autowired(required = false) StringRedisTemplate redisTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        initDatabase();
    }

    private void initDatabase() {
        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS wallets (
                        wallet_id VARCHAR(64) PRIMARY KEY,
                        currency VARCHAR(16) NOT NULL DEFAULT 'USD',
                        balance DOUBLE PRECISION NOT NULL DEFAULT 150.00,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS wallet_transactions (
                        transaction_id VARCHAR(64) PRIMARY KEY,
                        wallet_id VARCHAR(64) NOT NULL,
                        type VARCHAR(32) NOT NULL,
                        amount DOUBLE PRECISION NOT NULL,
                        balance_after DOUBLE PRECISION NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """);

                Integer count = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM wallets WHERE wallet_id = ?", Integer.class, DEFAULT_WALLET_ID
                );
                if (count == null || count == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO wallets (wallet_id, currency, balance, updated_at) VALUES (?, 'USD', 150.00, CURRENT_TIMESTAMP)",
                            DEFAULT_WALLET_ID
                    );
                    jdbcTemplate.update(
                            "INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) " +
                            "VALUES (?, ?, 'INITIAL_GRANT', 150.00, 150.00, 'CineMind VIP Welcome Bonus & Stored Value Grant', CURRENT_TIMESTAMP)",
                            "TXN-WLT-INIT-001", DEFAULT_WALLET_ID
                    );
                    log.info("💳 Initialized distributed CineCash wallet {} with $150.00 balance in PostgreSQL", DEFAULT_WALLET_ID);
                } else {
                    log.info("💳 Found existing distributed CineCash wallet {} in PostgreSQL (SSOT)", DEFAULT_WALLET_ID);
                }
                syncRedisCache();
            } catch (Exception e) {
                log.warn("⚠️ Failed to initialize wallets table in PostgreSQL, falling back to local memory: {}", e.getMessage());
            }
        } else {
            seedInitialFallback();
        }
    }

    private void seedInitialFallback() {
        fallbackTransactions.add(new WalletTransaction(
                "TXN-WLT-INIT-001",
                "INITIAL_GRANT",
                150.00,
                150.00,
                "CineMind VIP Welcome Bonus & Stored Value Grant",
                Instant.now().minusSeconds(86400)
        ));
    }

    private void syncRedisCache() {
        if (redisTemplate != null && jdbcTemplate != null) {
            try {
                Double bal = jdbcTemplate.queryForObject(
                        "SELECT balance FROM wallets WHERE wallet_id = ?", Double.class, DEFAULT_WALLET_ID
                );
                if (bal != null) {
                    redisTemplate.opsForValue().set(REDIS_BALANCE_KEY, String.valueOf(bal), Duration.ofMinutes(15));
                }
            } catch (Exception e) {
                log.debug("Redis wallet balance cache sync skipped: {}", e.getMessage());
            }
        }
    }

    private void updateRedisCache(double newBalance) {
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(REDIS_BALANCE_KEY, String.valueOf(newBalance), Duration.ofMinutes(15));
            } catch (Exception e) {
                log.debug("Redis wallet balance update skipped: {}", e.getMessage());
            }
        }
    }

    @Override
    public WalletSummary getWalletSummary() {
        if (jdbcTemplate != null) {
            try {
                Double currentBalance = null;
                if (redisTemplate != null) {
                    try {
                        String cached = redisTemplate.opsForValue().get(REDIS_BALANCE_KEY);
                        if (cached != null) {
                            currentBalance = Double.parseDouble(cached);
                        }
                    } catch (Exception ignored) {}
                }
                if (currentBalance == null) {
                    currentBalance = jdbcTemplate.queryForObject(
                            "SELECT balance FROM wallets WHERE wallet_id = ?", Double.class, DEFAULT_WALLET_ID
                    );
                }
                double bal = (currentBalance != null) ? Math.round(currentBalance * 100.0) / 100.0 : 0.0;

                List<WalletTransaction> txns = jdbcTemplate.query(
                        "SELECT transaction_id, type, amount, balance_after, description, created_at " +
                        "FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 50",
                        this::mapRowToTransaction,
                        DEFAULT_WALLET_ID
                );
                return new WalletSummary(DEFAULT_WALLET_ID, "USD", bal, txns.size(), txns);
            } catch (Exception e) {
                log.warn("⚠️ Error fetching wallet summary from PostgreSQL: {}", e.getMessage());
            }
        }

        return new WalletSummary(
                DEFAULT_WALLET_ID,
                "USD",
                Math.round(fallbackBalance.get() * 100.0) / 100.0,
                fallbackTransactions.size(),
                new ArrayList<>(fallbackTransactions)
        );
    }

    @Override
    @Transactional
    public WalletTransaction topUp(double amount, String paymentMethod) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Top-up amount must be positive");
        }

        if (jdbcTemplate != null) {
            // Pessimistic Row Lock: SELECT ... FOR UPDATE ensures zero concurrent race conditions across cluster pods
            Double currentBalance = jdbcTemplate.queryForObject(
                    "SELECT balance FROM wallets WHERE wallet_id = ? FOR UPDATE", Double.class, DEFAULT_WALLET_ID
            );
            double current = (currentBalance != null) ? currentBalance : 0.0;
            double updated = Math.round((current + amount) * 100.0) / 100.0;
            Instant now = Instant.now();

            jdbcTemplate.update(
                    "UPDATE wallets SET balance = ?, updated_at = ? WHERE wallet_id = ?",
                    updated, Timestamp.from(now), DEFAULT_WALLET_ID
            );

            String txnId = "TXN-TOPUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String desc = "Wallet reload via " + (paymentMethod != null ? paymentMethod : "Stripe Card ending in 4242");

            jdbcTemplate.update(
                    "INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) " +
                    "VALUES (?, ?, 'TOP_UP', ?, ?, ?, ?)",
                    txnId, DEFAULT_WALLET_ID, amount, updated, desc, Timestamp.from(now)
            );

            updateRedisCache(updated);
            log.info("💳 [Distributed] Wallet topped up in PostgreSQL (SSOT): amount={}, newBalance={}", amount, updated);
            return new WalletTransaction(txnId, "TOP_UP", amount, updated, desc, now);
        }

        // Fallback in-memory
        synchronized (this) {
            double current = fallbackBalance.get();
            double updated = Math.round((current + amount) * 100.0) / 100.0;
            fallbackBalance.set(updated);
            String txnId = "TXN-TOPUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            WalletTransaction txn = new WalletTransaction(
                    txnId, "TOP_UP", amount, updated,
                    "Wallet reload via " + (paymentMethod != null ? paymentMethod : "Stripe Card ending in 4242"),
                    Instant.now()
            );
            fallbackTransactions.add(0, txn);
            return txn;
        }
    }

    @Override
    @Transactional
    public WalletTransaction debit(double amount, String type, String description) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Debit amount must be positive");
        }

        if (jdbcTemplate != null) {
            // Pessimistic Row Lock: SELECT ... FOR UPDATE eliminates double-spend across cluster nodes
            Double currentBalance = jdbcTemplate.queryForObject(
                    "SELECT balance FROM wallets WHERE wallet_id = ? FOR UPDATE", Double.class, DEFAULT_WALLET_ID
            );
            double current = (currentBalance != null) ? currentBalance : 0.0;
            if (current < amount) {
                throw new IllegalStateException(String.format("Insufficient wallet funds: Available $%.2f, Required $%.2f", current, amount));
            }
            double updated = Math.round((current - amount) * 100.0) / 100.0;
            Instant now = Instant.now();

            jdbcTemplate.update(
                    "UPDATE wallets SET balance = ?, updated_at = ? WHERE wallet_id = ?",
                    updated, Timestamp.from(now), DEFAULT_WALLET_ID
            );

            String txnId = "TXN-DEBIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String txnType = (type != null) ? type : "PAYMENT";
            String desc = (description != null) ? description : "CineMind Purchase";

            jdbcTemplate.update(
                    "INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    txnId, DEFAULT_WALLET_ID, txnType, amount, updated, desc, Timestamp.from(now)
            );

            updateRedisCache(updated);
            log.info("💸 [Distributed] Wallet debited in PostgreSQL (SSOT): amount={}, newBalance={}, desc='{}'", amount, updated, desc);
            return new WalletTransaction(txnId, txnType, amount, updated, desc, now);
        }

        // Fallback in-memory
        synchronized (this) {
            double current = fallbackBalance.get();
            if (current < amount) {
                throw new IllegalStateException(String.format("Insufficient wallet funds: Available $%.2f, Required $%.2f", current, amount));
            }
            double updated = Math.round((current - amount) * 100.0) / 100.0;
            fallbackBalance.set(updated);
            String txnId = "TXN-DEBIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            WalletTransaction txn = new WalletTransaction(
                    txnId, type != null ? type : "PAYMENT", amount, updated,
                    description != null ? description : "CineMind Purchase", Instant.now()
            );
            fallbackTransactions.add(0, txn);
            return txn;
        }
    }

    @Override
    @Transactional
    public WalletTransaction creditRefund(double amount, String reason) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Refund amount must be positive");
        }

        if (jdbcTemplate != null) {
            Double currentBalance = jdbcTemplate.queryForObject(
                    "SELECT balance FROM wallets WHERE wallet_id = ? FOR UPDATE", Double.class, DEFAULT_WALLET_ID
            );
            double current = (currentBalance != null) ? currentBalance : 0.0;
            double updated = Math.round((current + amount) * 100.0) / 100.0;
            Instant now = Instant.now();

            jdbcTemplate.update(
                    "UPDATE wallets SET balance = ?, updated_at = ? WHERE wallet_id = ?",
                    updated, Timestamp.from(now), DEFAULT_WALLET_ID
            );

            String txnId = "TXN-REFUND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String desc = (reason != null) ? reason : "Ticket/Order Refund";

            jdbcTemplate.update(
                    "INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) " +
                    "VALUES (?, ?, 'REFUND', ?, ?, ?, ?)",
                    txnId, DEFAULT_WALLET_ID, amount, updated, desc, Timestamp.from(now)
            );

            updateRedisCache(updated);
            log.info("💰 [Distributed] Wallet refund credited in PostgreSQL (SSOT): amount={}, newBalance={}", amount, updated);
            return new WalletTransaction(txnId, "REFUND", amount, updated, desc, now);
        }

        synchronized (this) {
            double current = fallbackBalance.get();
            double updated = Math.round((current + amount) * 100.0) / 100.0;
            fallbackBalance.set(updated);
            String txnId = "TXN-REFUND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            WalletTransaction txn = new WalletTransaction(
                    txnId, "REFUND", amount, updated,
                    reason != null ? reason : "Ticket/Order Refund", Instant.now()
            );
            fallbackTransactions.add(0, txn);
            return txn;
        }
    }

    private WalletTransaction mapRowToTransaction(ResultSet rs, int rowNum) throws SQLException {
        return new WalletTransaction(
                rs.getString("transaction_id"),
                rs.getString("type"),
                rs.getDouble("amount"),
                rs.getDouble("balance_after"),
                rs.getString("description"),
                rs.getTimestamp("created_at").toInstant()
        );
    }
}
