package com.skills.ai.split;

import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentGatewayAdapter;
import com.skills.ai.patterns.adapter.PaymentResult;
import com.skills.ai.persistence.queries.SplitMoneySqlQueries;
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
import java.util.stream.Collectors;

import static com.skills.ai.persistence.queries.SplitMoneySqlQueries.*;

/**
 * Enterprise Service Implementation for Squad Bill Splitting & Shared Payments.
 * Adheres strictly to Single Source of Truth (PostgreSQL) and zero dual-write principles.
 * Eliminates ad-hoc in-memory fallback maps and hardcoded seed mocks.
 */
@Slf4j
@Service
public class SplitMoneyServiceImpl implements SplitMoneyService {

    private final WalletService walletService;
    private final PaymentAdapterRegistry paymentAdapterRegistry;
    private final JdbcTemplate jdbcTemplate;

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
                Integer userCount = jdbcTemplate.queryForObject(COUNT_USERS, Integer.class);
                log.info("👥 Found {} persisted squad users in PostgreSQL (SSOT). Zero startup seeding needed.", userCount != null ? userCount : 0);
            } catch (Exception e) {
                log.warn("⚠️ Failed to verify SplitMoney schema in PostgreSQL: {}", e.getMessage());
            }
        }
    }

    @Override
    public List<SplitUser> listUsers() {
        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            return jdbcTemplate.query(SELECT_ALL_USERS, this::mapRowToUser);
        } catch (Exception e) {
            log.warn("⚠️ Error listing users from PostgreSQL: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<SplitUser> getUser(String id) {
        if (id == null || jdbcTemplate == null) return Optional.empty();
        try {
            List<SplitUser> users = jdbcTemplate.query(SELECT_USER_BY_ID, this::mapRowToUser, id);
            if (!users.isEmpty()) return Optional.of(users.get(0));
        } catch (Exception e) {
            log.warn("⚠️ Error getting user {} from PostgreSQL: {}", id, e.getMessage());
        }
        return Optional.empty();
    }

    @Override
    public List<SplitGroup> listGroups() {
        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            return jdbcTemplate.query(SELECT_ALL_GROUPS, (rs, rowNum) -> {
                String groupId = rs.getString("id");
                List<SplitUser> members = jdbcTemplate.query(
                        SELECT_GROUP_MEMBERS,
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
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<SplitGroup> getGroup(String id) {
        if (id == null || jdbcTemplate == null) return Optional.empty();
        try {
            List<SplitGroup> list = jdbcTemplate.query(SELECT_GROUP_BY_ID, (rs, rowNum) -> {
                String groupId = rs.getString("id");
                List<SplitUser> members = jdbcTemplate.query(
                        SELECT_GROUP_MEMBERS,
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
        return Optional.empty();
    }

    @Override
    @Transactional
    public SplitGroup createGroup(String name, String description, List<String> memberUserIds) {
        if (jdbcTemplate == null) {
            throw new IllegalStateException("Database connection required for creating squad groups");
        }
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
        jdbcTemplate.update(
                INSERT_GROUP,
                groupId, name, description, Timestamp.from(now)
        );
        for (SplitUser u : members) {
            jdbcTemplate.update(
                    INSERT_GROUP_MEMBER_IF_NOT_EXISTS,
                    groupId, u.id()
            );
        }
        log.info("👥 [Distributed] Created group '{}' (id={}) with {} members in PostgreSQL", name, groupId, members.size());
        return new SplitGroup(groupId, name, description, members, now);
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
        if (jdbcTemplate == null) {
            throw new IllegalStateException("Database connection required for bill splitting");
        }

        SplitUser payer = getUser(paidByUserId).orElseGet(() -> listUsers().stream().findFirst().orElseThrow(
                () -> new IllegalStateException("Payer not found and no squad users available in database")
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

        jdbcTemplate.update(
                INSERT_EXPENSE,
                expenseId, "grp-imax-squad", name, totalAmount, payer.id(), payer.getFullName(),
                SplitExpenseType.EQUAL.name(), referenceType != null ? referenceType : "CUSTOM",
                referenceId != null ? referenceId : "REF-GEN", Timestamp.from(now)
        );

        for (UserShare share : shares) {
            String shareId = "SHR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            jdbcTemplate.update(
                    INSERT_SHARE,
                    shareId, expenseId, share.userId(), share.userName(), share.shareAmount(),
                    share.isPaid(), share.paymentMethod(), share.paidAt() != null ? Timestamp.from(share.paidAt()) : null
            );
        }

        log.info("💸 [Distributed] Split expense '{}' (${}) among {} patrons in PostgreSQL. Share: ${} each",
                name, totalAmount, count, equalShare);
        return new SplitExpense(expenseId, name, totalAmount, payer.id(), payer.getFullName(),
                SplitExpenseType.EQUAL, "grp-imax-squad", referenceType, referenceId, shares, now);
    }

    @Override
    public List<SplitExpense> listExpenses() {
        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            return jdbcTemplate.query(
                    SELECT_ALL_EXPENSES,
                    (rs, rowNum) -> {
                        String expId = rs.getString("id");
                        List<UserShare> shares = jdbcTemplate.query(
                                SELECT_SHARES_BY_EXPENSE_ID,
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
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<SplitExpense> getExpense(String id) {
        if (id == null || jdbcTemplate == null) return Optional.empty();
        try {
            List<SplitExpense> list = jdbcTemplate.query(
                    SELECT_EXPENSE_BY_ID,
                    (rs, rowNum) -> {
                        String expId = rs.getString("id");
                        List<UserShare> shares = jdbcTemplate.query(
                                SELECT_SHARES_BY_EXPENSE_ID,
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
                    },
                    id
            );
            if (!list.isEmpty()) return Optional.of(list.get(0));
        } catch (Exception e) {
            log.warn("⚠️ Error getting expense {} from PostgreSQL: {}", id, e.getMessage());
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public UserShare settleShare(String expenseId, String debtorUserId, String paymentMethod) {
        if (jdbcTemplate == null) {
            throw new IllegalStateException("Database connection required for share settlement");
        }

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
        jdbcTemplate.update(
                UPDATE_SHARE_SETTLED,
                method, Timestamp.from(now), expenseId, debtorUserId
        );
        log.info("💳 [Distributed] Share settled in PostgreSQL: expense={}, user={}, method={}", expenseId, debtorUserId, method);

        return targetShare.withPayment(method);
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
