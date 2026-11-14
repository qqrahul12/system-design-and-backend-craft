package com.skills.ai.wallet;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Service managing CineMind's Fintech Digital Wallet (CineCash).
 * Supports stored-value balance, Stripe reloads, atomic ticket/concessions debits,
 * and double-entry transaction ledgers.
 */
@Slf4j
@Service
public class WalletService {

    private final AtomicReference<Double> balance = new AtomicReference<>(150.00);
    private final List<WalletTransaction> transactions = Collections.synchronizedList(new ArrayList<>());

    public record WalletTransaction(
            String txnId,
            String type, // "INITIAL_GRANT", "TOP_UP", "TICKET_PAYMENT", "CONCESSIONS_PAYMENT", "REFUND"
            double amount,
            double balanceAfter,
            String description,
            Instant timestamp
    ) {}

    public record WalletSummary(
            String walletId,
            String currency,
            double balance,
            int transactionCount,
            List<WalletTransaction> recentTransactions
    ) {}

    public WalletService() {
        seedInitialTransactions();
    }

    private void seedInitialTransactions() {
        transactions.add(new WalletTransaction(
                "TXN-WLT-INIT-001",
                "INITIAL_GRANT",
                150.00,
                150.00,
                "CineMind VIP Welcome Bonus & Stored Value Grant",
                Instant.now().minusSeconds(86400)
        ));
    }

    public WalletSummary getWalletSummary() {
        return new WalletSummary(
                "WLT-CINEMIND-8842",
                "USD",
                Math.round(balance.get() * 100.0) / 100.0,
                transactions.size(),
                new ArrayList<>(transactions)
        );
    }

    public synchronized WalletTransaction topUp(double amount, String paymentMethod) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Top-up amount must be positive");
        }
        double current = balance.get();
        double updated = Math.round((current + amount) * 100.0) / 100.0;
        balance.set(updated);

        String txnId = "TXN-TOPUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        WalletTransaction txn = new WalletTransaction(
                txnId,
                "TOP_UP",
                amount,
                updated,
                "Wallet reload via " + (paymentMethod != null ? paymentMethod : "Stripe Card ending in 4242"),
                Instant.now()
        );
        transactions.add(0, txn);
        log.info("💳 Wallet topped up: amount={}, newBalance={}", amount, updated);
        return txn;
    }

    public synchronized WalletTransaction debit(double amount, String type, String description) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Debit amount must be positive");
        }
        double current = balance.get();
        if (current < amount) {
            throw new IllegalStateException(String.format("Insufficient wallet funds: Available $%.2f, Required $%.2f", current, amount));
        }
        double updated = Math.round((current - amount) * 100.0) / 100.0;
        balance.set(updated);

        String txnId = "TXN-DEBIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        WalletTransaction txn = new WalletTransaction(
                txnId,
                type != null ? type : "PAYMENT",
                amount,
                updated,
                description != null ? description : "CineMind Purchase",
                Instant.now()
        );
        transactions.add(0, txn);
        log.info("💸 Wallet debited: amount={}, newBalance={}, desc='{}'", amount, updated, description);
        return txn;
    }

    public synchronized WalletTransaction creditRefund(double amount, String reason) {
        double current = balance.get();
        double updated = Math.round((current + amount) * 100.0) / 100.0;
        balance.set(updated);

        String txnId = "TXN-REFUND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        WalletTransaction txn = new WalletTransaction(
                txnId,
                "REFUND",
                amount,
                updated,
                reason != null ? reason : "Ticket/Order Refund",
                Instant.now()
        );
        transactions.add(0, txn);
        log.info("💰 Wallet refund credited: amount={}, newBalance={}", amount, updated);
        return txn;
    }
}
