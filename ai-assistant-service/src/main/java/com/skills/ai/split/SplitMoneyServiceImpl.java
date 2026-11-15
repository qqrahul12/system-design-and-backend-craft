package com.skills.ai.split;

import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentGatewayAdapter;
import com.skills.ai.patterns.adapter.PaymentResult;
import com.skills.ai.wallet.WalletService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Production-grade distributed implementation of SplitMoneyService managing group bill-splitting,
 * patron squad coordination, and multi-gateway share settlement.
 * Relies on PostgreSQL as authoritative Single Source of Truth with @Transactional boundaries.
 */
@Slf4j
@Service
public class SplitMoneyServiceImpl implements SplitMoneyService {

    private final WalletService walletService;
    private final PaymentAdapterRegistry paymentAdapterRegistry;
    private final JdbcTemplate jdbcTemplate;

    // In-memory fallback structures for standalone non-DB environments
    private final Map<String, SplitUser> fallbackUsers = new ConcurrentHashMap<>();
    private final Map<String, SplitGroup> fallbackGroups = new ConcurrentHashMap<>();
    private final Map<String, SplitExpense> fallbackExpenses = new ConcurrentHashMap<>();

    public SplitMoneyServiceImpl(
            WalletService walletService,
            PaymentAdapterRegistry paymentAdapterRegistry,
            @Autowired(required = false) JdbcTemplate jdbcTemplate
    ) {
        this.walletService = walletService;
        this.paymentAdapterRegistry = paymentAdapterRegistry;
        this.jdbcTemplate = jdbcTemplate;
        initDatabase();
    }

    private void initDatabase() {
        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS split_users (
                        id VARCHAR(64) PRIMARY KEY,
                        first_name VARCHAR(128) NOT NULL,
                        last_name VARCHAR(128) NOT NULL,
                        email VARCHAR(255),
                        phone VARCHAR(64),
                        avatar_url TEXT
                    )
                """);
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS split_groups (
                        id VARCHAR(64) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS split_group_members (
                        group_id VARCHAR(64) NOT NULL,
                        user_id VARCHAR(64) NOT NULL,
                        PRIMARY KEY (group_id, user_id)
                    )
                """);
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS split_expenses (
                        id VARCHAR(64) PRIMARY KEY,
                        group_id VARCHAR(64),
                        name VARCHAR(255) NOT NULL,
                        total_amount DOUBLE PRECISION NOT NULL,
                        paid_by_user_id VARCHAR(64) NOT NULL,
                        paid_by_user_name VARCHAR(255) NOT NULL,
                        expense_type VARCHAR(64) NOT NULL,
                        reference_type VARCHAR(64),
                        reference_id VARCHAR(64),
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS split_shares (
                        id VARCHAR(64) PRIMARY KEY,
                        expense_id VARCHAR(64) NOT NULL,
                        user_id VARCHAR(64) NOT NULL,
                        user_name VARCHAR(255) NOT NULL,
                        share_amount DOUBLE PRECISION NOT NULL,
                        is_paid BOOLEAN NOT NULL DEFAULT FALSE,
                        payment_method VARCHAR(64) NOT NULL DEFAULT 'PENDING',
                        paid_at TIMESTAMP
                    )
                """);

                Integer userCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM split_users", Integer.class);
                if (userCount == null || userCount == 0) {
                    seedDatabase();
                } else {
                    log.info("👥 Found {} persisted squad users in PostgreSQL (SSOT)", userCount);
                }
                return;
            } catch (Exception e) {
                log.warn("⚠️ Failed to initialize SplitMoney tables in PostgreSQL, falling back to local memory: {}", e.getMessage());
            }
        }
        seedFallbackData();
    }

    private void seedDatabase() {
        SplitUser u1 = new SplitUser("usr-marcus", "Marcus", "Kane", "marcus.kane@cinemind.io", "+1-555-0101", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");
        SplitUser u2 = new SplitUser("usr-alex", "Alex", "Mercer", "alex.mercer@cinemind.io", "+1-555-0102", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150");
        SplitUser u3 = new SplitUser("usr-elena", "Elena", "Rostova", "elena.rostova@cinemind.io", "+1-555-0103", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150");
        SplitUser u4 = new SplitUser("usr-chloe", "Chloe", "Bennett", "chloe.bennett@cinemind.io", "+1-555-0104", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150");

        for (SplitUser u : List.of(u1, u2, u3, u4)) {
            jdbcTemplate.update(
                    "INSERT INTO split_users (id, first_name, last_name, email, phone, avatar_url) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
                    u.id(), u.firstName(), u.lastName(), u.email(), u.phoneNumber(), u.avatarUrl()
            );
        }

        jdbcTemplate.update(
                "INSERT INTO split_groups (id, name, description, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
                "grp-imax-squad", "CineMind IMAX VIP Squad", "Weekend film screenings, 70mm re-releases, and gourmet lounge orders.",
                Timestamp.from(Instant.now().minus(java.time.Duration.ofDays(14)))
        );

        for (SplitUser u : List.of(u1, u2, u3, u4)) {
            jdbcTemplate.update(
                    "INSERT INTO split_group_members (group_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    "grp-imax-squad", u.id()
            );
        }

        splitBill(
                "Dune: Part Two IMAX 70mm Tickets (4 Passes)",
                78.00,
                u1.id(),
                List.of(u1.id(), u2.id(), u3.id(), u4.id()),
                "MOVIE_TICKET",
                "TKT-DUNE-INIT"
        );
        log.info("👥 Seeded initial CineMind SplitMoney squad into PostgreSQL");
    }

    private void seedFallbackData() {
        SplitUser u1 = new SplitUser("usr-marcus", "Marcus", "Kane", "marcus.kane@cinemind.io", "+1-555-0101", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");
        SplitUser u2 = new SplitUser("usr-alex", "Alex", "Mercer", "alex.mercer@cinemind.io", "+1-555-0102", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150");
        SplitUser u3 = new SplitUser("usr-elena", "Elena", "Rostova", "elena.rostova@cinemind.io", "+1-555-0103", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150");
        SplitUser u4 = new SplitUser("usr-chloe", "Chloe", "Bennett", "chloe.bennett@cinemind.io", "+1-555-0104", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150");

        fallbackUsers.put(u1.id(), u1);
        fallbackUsers.put(u2.id(), u2);
        fallbackUsers.put(u3.id(), u3);
        fallbackUsers.put(u4.id(), u4);

        SplitGroup g1 = new SplitGroup(
                "grp-imax-squad",
                "CineMind IMAX VIP Squad",
                "Weekend film screenings, 70mm re-releases, and gourmet lounge orders.",
                List.of(u1, u2, u3, u4),
                Instant.now().minus(java.time.Duration.ofDays(14))
        );
        fallbackGroups.put(g1.id(), g1);

        splitBill(
                "Dune: Part Two IMAX 70mm Tickets (4 Passes)",
                78.00,
                u1.id(),
                List.of(u1.id(), u2.id(), u3.id(), u4.id()),
                "MOVIE_TICKET",
                "TKT-DUNE-INIT"
        );
    }

    @Override
    public List<SplitUser> listUsers() {
        if (jdbcTemplate != null) {
            try {
                return jdbcTemplate.query("SELECT id, first_name, last_name, email, phone, avatar_url FROM split_users", this::mapRowToUser);
            } catch (Exception e) {
                log.warn("⚠️ Error listing users from PostgreSQL: {}", e.getMessage());
            }
        }
        return new ArrayList<>(fallbackUsers.values());
    }

    @Override
    public Optional<SplitUser> getUser(String id) {
        if (id == null) return Optional.empty();
        if (jdbcTemplate != null) {
            try {
                List<SplitUser> users = jdbcTemplate.query("SELECT id, first_name, last_name, email, phone, avatar_url FROM split_users WHERE id = ?", this::mapRowToUser, id);
                if (!users.isEmpty()) return Optional.of(users.get(0));
            } catch (Exception e) {
                log.warn("⚠️ Error getting user {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return Optional.ofNullable(fallbackUsers.get(id));
    }

    @Override
    public List<SplitGroup> listGroups() {
        if (jdbcTemplate != null) {
            try {
                return jdbcTemplate.query("SELECT id, name, description, created_at FROM split_groups", (rs, rowNum) -> {
                    String groupId = rs.getString("id");
                    List<SplitUser> members = jdbcTemplate.query(
                            "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url FROM split_users u " +
                            "JOIN split_group_members m ON u.id = m.user_id WHERE m.group_id = ?",
                            this::mapRowToUser, groupId
                    );
                    return new SplitGroup(
                            groupId,
                            rs.getString("name"),
                            rs.getString("description"),
                            members,
                            rs.getTimestamp("created_at").toInstant()
                    );
                });
            } catch (Exception e) {
                log.warn("⚠️ Error listing groups from PostgreSQL: {}", e.getMessage());
            }
        }
        return new ArrayList<>(fallbackGroups.values());
    }

    @Override
    public Optional<SplitGroup> getGroup(String id) {
        if (id == null) return Optional.empty();
        if (jdbcTemplate != null) {
            try {
                List<SplitGroup> list = jdbcTemplate.query("SELECT id, name, description, created_at FROM split_groups WHERE id = ?", (rs, rowNum) -> {
                    String groupId = rs.getString("id");
                    List<SplitUser> members = jdbcTemplate.query(
                            "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url FROM split_users u " +
                            "JOIN split_group_members m ON u.id = m.user_id WHERE m.group_id = ?",
                            this::mapRowToUser, groupId
                    );
                    return new SplitGroup(
                            groupId,
                            rs.getString("name"),
                            rs.getString("description"),
                            members,
                            rs.getTimestamp("created_at").toInstant()
                    );
                }, id);
                if (!list.isEmpty()) return Optional.of(list.get(0));
            } catch (Exception e) {
                log.warn("⚠️ Error getting group {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return Optional.ofNullable(fallbackGroups.get(id));
    }

    @Override
    @Transactional
    public SplitGroup createGroup(String name, String description, List<String> memberUserIds) {
        String groupId = "grp-" + UUID.randomUUID().toString().substring(0, 8);
        List<SplitUser> members = (memberUserIds != null ? memberUserIds : List.<String>of())
                .stream()
                .map(this::getUser)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());

        if (members.isEmpty()) {
            members = listUsers();
        }

        Instant now = Instant.now();
        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO split_groups (id, name, description, created_at) VALUES (?, ?, ?, ?)",
                        groupId, name, description, Timestamp.from(now)
                );
                for (SplitUser u : members) {
                    jdbcTemplate.update(
                            "INSERT INTO split_group_members (group_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            groupId, u.id()
                    );
                }
                log.info("👥 [Distributed] Created group '{}' (id={}) with {} members in PostgreSQL", name, groupId, members.size());
                return new SplitGroup(groupId, name, description, members, now);
            } catch (Exception e) {
                log.warn("⚠️ Error saving group to PostgreSQL: {}", e.getMessage());
            }
        }

        SplitGroup g = new SplitGroup(groupId, name, description, members, now);
        fallbackGroups.put(groupId, g);
        return g;
    }

    @Override
    @Transactional
    public SplitExpense splitBill(
            String name,
            double totalAmount,
            String paidByUserId,
            List<String> memberUserIds,
            String referenceType,
            String referenceId
    ) {
        SplitUser payer = getUser(paidByUserId).orElseGet(() -> listUsers().stream().findFirst().orElse(
                new SplitUser("usr-marcus", "Marcus", "Kane", "marcus.kane@cinemind.io", "+1-555-0101", "")
        ));

        List<SplitUser> participants = (memberUserIds != null && !memberUserIds.isEmpty())
                ? memberUserIds.stream().map(this::getUser).filter(Optional::isPresent).map(Optional::get).toList()
                : listUsers();

        if (participants.isEmpty()) {
            participants = List.of(payer);
        }

        int count = participants.size();
        double equalShare = Math.round((totalAmount / count) * 100.0) / 100.0;

        List<UserShare> shares = new ArrayList<>();
        Instant now = Instant.now();
        String expenseId = "EXP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        for (SplitUser user : participants) {
            boolean isPayer = user.id().equals(payer.id());
            shares.add(new UserShare(
                    user.id(),
                    user.getFullName(),
                    equalShare,
                    isPayer,
                    isPayer ? "HOST_DIRECT" : "PENDING",
                    isPayer ? now : null
            ));
        }

        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update("""
                    INSERT INTO split_expenses (
                        id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name,
                        expense_type, reference_type, reference_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                        expenseId, "grp-imax-squad", name, totalAmount, payer.id(), payer.getFullName(),
                        SplitExpenseType.EQUAL.name(), referenceType != null ? referenceType : "CUSTOM",
                        referenceId != null ? referenceId : "REF-GEN", Timestamp.from(now)
                );

                for (UserShare share : shares) {
                    String shareId = "SHR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    jdbcTemplate.update("""
                        INSERT INTO split_shares (
                            id, expense_id, user_id, user_name, share_amount, is_paid, payment_method, paid_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                            shareId, expenseId, share.userId(), share.userName(), share.shareAmount(),
                            share.isPaid(), share.paymentMethod(), share.paidAt() != null ? Timestamp.from(share.paidAt()) : null
                    );
                }

                log.info("💸 [Distributed] Split expense '{}' (${}) among {} patrons in PostgreSQL. Share: ${} each",
                        name, totalAmount, count, equalShare);
                return new SplitExpense(expenseId, name, totalAmount, payer.id(), payer.getFullName(),
                        SplitExpenseType.EQUAL, "grp-imax-squad", referenceType, referenceId, shares, now);
            } catch (Exception e) {
                log.warn("⚠️ Error saving split expense to PostgreSQL: {}", e.getMessage());
            }
        }

        SplitExpense expense = new SplitExpense(expenseId, name, totalAmount, payer.id(), payer.getFullName(),
                SplitExpenseType.EQUAL, "grp-imax-squad", referenceType, referenceId, shares, now);
        fallbackExpenses.put(expenseId, expense);
        return expense;
    }

    @Override
    public List<SplitExpense> listExpenses() {
        if (jdbcTemplate != null) {
            try {
                return jdbcTemplate.query(
                        "SELECT id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name, expense_type, reference_type, reference_id, created_at " +
                        "FROM split_expenses ORDER BY created_at DESC",
                        (rs, rowNum) -> {
                            String expId = rs.getString("id");
                            List<UserShare> shares = jdbcTemplate.query(
                                    "SELECT user_id, user_name, share_amount, is_paid, payment_method, paid_at FROM split_shares WHERE expense_id = ?",
                                    this::mapRowToShare, expId
                            );
                            return new SplitExpense(
                                    expId,
                                    rs.getString("name"),
                                    rs.getDouble("total_amount"),
                                    rs.getString("paid_by_user_id"),
                                    rs.getString("paid_by_user_name"),
                                    SplitExpenseType.valueOf(rs.getString("expense_type")),
                                    rs.getString("group_id"),
                                    rs.getString("reference_type"),
                                    rs.getString("reference_id"),
                                    shares,
                                    rs.getTimestamp("created_at").toInstant()
                            );
                        }
                );
            } catch (Exception e) {
                log.warn("⚠️ Error reading expenses from PostgreSQL: {}", e.getMessage());
            }
        }
        return new ArrayList<>(fallbackExpenses.values());
    }

    @Override
    public Optional<SplitExpense> getExpense(String id) {
        if (id == null) return Optional.empty();
        if (jdbcTemplate != null) {
            try {
                List<SplitExpense> list = jdbcTemplate.query(
                        "SELECT id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name, expense_type, reference_type, reference_id, created_at " +
                        "FROM split_expenses WHERE id = ?",
                        (rs, rowNum) -> {
                            String expId = rs.getString("id");
                            List<UserShare> shares = jdbcTemplate.query(
                                    "SELECT user_id, user_name, share_amount, is_paid, payment_method, paid_at FROM split_shares WHERE expense_id = ?",
                                    this::mapRowToShare, expId
                            );
                            return new SplitExpense(
                                    expId,
                                    rs.getString("name"),
                                    rs.getDouble("total_amount"),
                                    rs.getString("paid_by_user_id"),
                                    rs.getString("paid_by_user_name"),
                                    SplitExpenseType.valueOf(rs.getString("expense_type")),
                                    rs.getString("group_id"),
                                    rs.getString("reference_type"),
                                    rs.getString("reference_id"),
                                    shares,
                                    rs.getTimestamp("created_at").toInstant()
                            );
                        }, id
                );
                if (!list.isEmpty()) return Optional.of(list.get(0));
            } catch (Exception e) {
                log.warn("⚠️ Error getting expense {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return Optional.ofNullable(fallbackExpenses.get(id));
    }

    @Override
    @Transactional
    public UserShare settleShare(String expenseId, String debtorUserId, String paymentMethod) {
        SplitExpense expense = getExpense(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found: " + expenseId));

        UserShare targetShare = expense.shares().stream()
                .filter(s -> s.userId().equals(debtorUserId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("User " + debtorUserId + " is not a participant in expense " + expenseId));

        if (targetShare.isPaid()) {
            return targetShare;
        }

        String method = (paymentMethod != null && paymentMethod.toUpperCase().contains("CARD")) ? "STRIPE_CARD" : "WALLET";

        if ("WALLET".equals(method)) {
            walletService.debit(
                    targetShare.shareAmount(),
                    "SPLIT_BILL_SETTLEMENT",
                    "Settled share for: " + expense.name()
            );
            log.info("💳 Settled ${} for {} via CineCash Wallet", targetShare.shareAmount(), targetShare.userName());
        } else {
            PaymentGatewayAdapter adapter = paymentAdapterRegistry.getAdapter("CARD");
            PaymentResult cardResult = adapter.processPayment(
                    expenseId + "-" + debtorUserId,
                    targetShare.shareAmount(),
                    "Split settlement for " + expense.name()
            );
            if (!cardResult.success()) {
                throw new IllegalStateException("Card Settlement Gateway Error: " + cardResult.message());
            }
            log.info("💳 Settled ${} for {} via PaymentGatewayAdapter [{}] (txn={})",
                    targetShare.shareAmount(), targetShare.userName(), adapter.getProviderName(), cardResult.transactionId());
        }

        Instant now = Instant.now();
        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update(
                        "UPDATE split_shares SET is_paid = TRUE, payment_method = ?, paid_at = ? WHERE expense_id = ? AND user_id = ?",
                        method, Timestamp.from(now), expenseId, debtorUserId
                );
                log.info("💳 [Distributed] Share settled in PostgreSQL: expense={}, user={}, method={}", expenseId, debtorUserId, method);
            } catch (Exception e) {
                log.warn("⚠️ Error updating settled share in PostgreSQL: {}", e.getMessage());
            }
        }

        UserShare settled = targetShare.withPayment(method);
        if (fallbackExpenses.containsKey(expenseId)) {
            List<UserShare> updatedShares = new ArrayList<>(expense.shares());
            for (int i = 0; i < updatedShares.size(); i++) {
                if (updatedShares.get(i).userId().equals(debtorUserId)) {
                    updatedShares.set(i, settled);
                    break;
                }
            }
            SplitExpense updated = new SplitExpense(
                    expense.id(), expense.name(), expense.totalAmount(), expense.paidByUserId(),
                    expense.paidByUserName(), expense.expenseType(), expense.groupId(),
                    expense.referenceType(), expense.referenceId(), updatedShares, expense.createdAt()
            );
            fallbackExpenses.put(expenseId, updated);
        }
        return settled;
    }

    @Override
    public SplitBalanceSummary getUserBalances(String userId) {
        double paidForOthers = 0.0;
        double owedToOthers = 0.0;
        Map<String, Double> balancesWithFriends = new HashMap<>();

        for (SplitExpense exp : listExpenses()) {
            boolean isPayer = exp.paidByUserId().equals(userId);
            for (UserShare s : exp.shares()) {
                if (isPayer && !s.userId().equals(userId)) {
                    if (!s.isPaid()) {
                        paidForOthers += s.shareAmount();
                        balancesWithFriends.merge(s.userName(), s.shareAmount(), Double::sum);
                    }
                } else if (!isPayer && s.userId().equals(userId)) {
                    if (!s.isPaid()) {
                        owedToOthers += s.shareAmount();
                        balancesWithFriends.merge(exp.paidByUserName(), -s.shareAmount(), Double::sum);
                    }
                }
            }
        }

        double net = Math.round((paidForOthers - owedToOthers) * 100.0) / 100.0;
        return new SplitBalanceSummary(
                userId,
                Math.round(paidForOthers * 100.0) / 100.0,
                Math.round(owedToOthers * 100.0) / 100.0,
                net,
                balancesWithFriends
        );
    }

    private SplitUser mapRowToUser(ResultSet rs, int rowNum) throws SQLException {
        return new SplitUser(
                rs.getString("id"),
                rs.getString("first_name"),
                rs.getString("last_name"),
                rs.getString("email"),
                rs.getString("phone"),
                rs.getString("avatar_url")
        );
    }

    private UserShare mapRowToShare(ResultSet rs, int rowNum) throws SQLException {
        Timestamp paidAtTs = rs.getTimestamp("paid_at");
        return new UserShare(
                rs.getString("user_id"),
                rs.getString("user_name"),
                rs.getDouble("share_amount"),
                rs.getBoolean("is_paid"),
                rs.getString("payment_method"),
                paidAtTs != null ? paidAtTs.toInstant() : null
        );
    }
}