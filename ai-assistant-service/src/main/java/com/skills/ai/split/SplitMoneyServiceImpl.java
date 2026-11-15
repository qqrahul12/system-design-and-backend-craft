package com.skills.ai.split;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentGatewayAdapter;
import com.skills.ai.patterns.adapter.PaymentResult;
import com.skills.ai.persistence.queries.SplitMoneySqlQueries;
import com.skills.ai.cache.RedisCache;
import com.skills.ai.util.JsonUtils;
import com.skills.ai.wallet.WalletService;
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
import java.util.Optional;
import java.util.stream.Collectors;

import static com.skills.ai.persistence.queries.SplitMoneySqlQueries.*;

/**
 * Enterprise Service Implementation for Squad Bill Splitting & Shared Payments.
 * Adheres strictly to Single Source of Truth (PostgreSQL) and zero dual-write principles.
 * Features L2 Distributed Redis caching with explicit TTLs (15m catalog, 5m ledger/balances)
 * and transactional cache eviction on bill mutations.
 */
@Slf4j
@Service
public class SplitMoneyServiceImpl implements SplitMoneyService {

    private static final String REDIS_KEY_SPLIT_USERS = "cinemind:split:users";
    private static final String REDIS_KEY_SPLIT_GROUPS = "cinemind:split:groups";
    private static final String REDIS_KEY_SPLIT_EXPENSES = "cinemind:split:expenses";
    private static final String REDIS_KEY_SPLIT_BALANCES_PREFIX = "cinemind:split:balances:";
    private static final Duration SPLIT_CATALOG_TTL = Duration.ofMinutes(15);
    private static final Duration SPLIT_LEDGER_TTL = Duration.ofMinutes(5);

    private final WalletService walletService;
    private final PaymentAdapterRegistry paymentAdapterRegistry;
    private final JdbcTemplate jdbcTemplate;
    private final RedisCache cache;
    private final ObjectMapper objectMapper;

    public SplitMoneyServiceImpl(
            WalletService walletService,
            PaymentAdapterRegistry paymentAdapterRegistry,
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            @Autowired(required = false) ObjectMapper objectMapper
    ) {
        this.walletService = walletService;
        this.paymentAdapterRegistry = paymentAdapterRegistry;
        this.jdbcTemplate = jdbcTemplate;
        this.cache = RedisCache.of(redisTemplate);
        this.objectMapper = (objectMapper != null) ? objectMapper : JsonUtils.getMapper();
        logStartupMetrics();
    }

    private void logStartupMetrics() {
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
        Optional<List<SplitUser>> cachedUsers = cache.getAndDeserialize(
                REDIS_KEY_SPLIT_USERS, raw -> objectMapper.readValue(raw, new TypeReference<List<SplitUser>>() {}));
        if (cachedUsers.isPresent() && !cachedUsers.get().isEmpty()) {
            log.debug("⚡ [Redis Cache HIT] Retrieved {} squad users in <1ms", cachedUsers.get().size());
            return cachedUsers.get();
        }

        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            List<SplitUser> users = jdbcTemplate.query(SELECT_ALL_USERS, this::mapRowToUser);
            cache.serializeAndSet(REDIS_KEY_SPLIT_USERS, users, objectMapper::writeValueAsString, SPLIT_CATALOG_TTL);
            return users;
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
        Optional<List<SplitGroup>> cachedGroups = cache.getAndDeserialize(
                REDIS_KEY_SPLIT_GROUPS, raw -> objectMapper.readValue(raw, new TypeReference<List<SplitGroup>>() {}));
        if (cachedGroups.isPresent() && !cachedGroups.get().isEmpty()) {
            log.debug("⚡ [Redis Cache HIT] Retrieved {} squad groups in <1ms", cachedGroups.get().size());
            return cachedGroups.get();
        }

        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            List<SplitGroup> groups = jdbcTemplate.query(SELECT_ALL_GROUPS, (rs, rowNum) -> {
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
            cache.serializeAndSet(REDIS_KEY_SPLIT_GROUPS, groups, objectMapper::writeValueAsString, SPLIT_CATALOG_TTL);
            return groups;
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
        cache.evict(REDIS_KEY_SPLIT_GROUPS);
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
        cache.evict(REDIS_KEY_SPLIT_EXPENSES);
        for (SplitUser user : participants) {
            cache.evict(REDIS_KEY_SPLIT_BALANCES_PREFIX + user.id());
        }
        return new SplitExpense(expenseId, name, totalAmount, payer.id(), payer.getFullName(),
                SplitExpenseType.EQUAL, "grp-imax-squad", referenceType, referenceId, shares, now);
    }

    @Override
    public List<SplitExpense> listExpenses() {
        Optional<List<SplitExpense>> cachedExpenses = cache.getAndDeserialize(
                REDIS_KEY_SPLIT_EXPENSES, raw -> objectMapper.readValue(raw, new TypeReference<List<SplitExpense>>() {}));
        if (cachedExpenses.isPresent() && !cachedExpenses.get().isEmpty()) {
            log.debug("⚡ [Redis Cache HIT] Retrieved {} split expenses in <1ms", cachedExpenses.get().size());
            return cachedExpenses.get();
        }

        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            // Batch load all shares in a single query to eliminate N+1 round-trips
            Map<String, List<UserShare>> sharesByExpenseId = new HashMap<>();
            jdbcTemplate.query(
                    SELECT_ALL_SHARES,
                    rs -> {
                        String expenseId = rs.getString("expense_id");
                        Instant paidAt = rs.getTimestamp("paid_at") != null
                                ? rs.getTimestamp("paid_at").toInstant()
                                : null;
                        UserShare share = new UserShare(
                                rs.getString("user_id"),
                                rs.getString("user_name"),
                                rs.getDouble("share_amount"),
                                rs.getBoolean("is_paid"),
                                rs.getString("payment_method"),
                                paidAt
                        );
                        sharesByExpenseId.computeIfAbsent(expenseId, k -> new ArrayList<>()).add(share);
                    }
            );

            List<SplitExpense> expenses = jdbcTemplate.query(
                    SELECT_ALL_EXPENSES,
                    (rs, rowNum) -> {
                        String expId = rs.getString("id");
                        List<UserShare> shares = sharesByExpenseId.getOrDefault(expId, Collections.emptyList());
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
            cache.serializeAndSet(REDIS_KEY_SPLIT_EXPENSES, expenses, objectMapper::writeValueAsString, SPLIT_LEDGER_TTL);
            return expenses;
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

        PaymentGatewayAdapter adapter = paymentAdapterRegistry.getAdapter(paymentMethod);
        PaymentResult paymentResult = adapter.processPayment(
                expenseId + "-" + debtorUserId,
                targetShare.shareAmount(),
                "Split settlement for " + expense.name()
        );
        if (!paymentResult.success()) {
            throw new IllegalStateException("Settlement Gateway Error: " + paymentResult.message());
        }
        log.info("💳 Settled ${} for {} via PaymentGatewayAdapter [{}] (txn={})",
                targetShare.shareAmount(), targetShare.userName(), adapter.getProviderName(), paymentResult.transactionId());

        String method = adapter.getProviderName().contains("WALLET") ? "WALLET" : "STRIPE_CARD";

        Instant now = Instant.now();
        jdbcTemplate.update(
                UPDATE_SHARE_SETTLED,
                method, Timestamp.from(now), expenseId, debtorUserId
        );
        log.info("💳 [Distributed] Share settled in PostgreSQL: expense={}, user={}, method={}", expenseId, debtorUserId, method);
        cache.evict(REDIS_KEY_SPLIT_EXPENSES,
                REDIS_KEY_SPLIT_BALANCES_PREFIX + debtorUserId,
                REDIS_KEY_SPLIT_BALANCES_PREFIX + expense.paidByUserId());

        return targetShare.withPayment(method);
    }

    @Override
    public SplitBalanceSummary getUserBalances(String userId) {
        if (userId == null) {
            return new SplitBalanceSummary("UNKNOWN", 0.0, 0.0, 0.0, Map.of());
        }

        Optional<SplitBalanceSummary> cachedBalance = cache.getAndDeserialize(
                REDIS_KEY_SPLIT_BALANCES_PREFIX + userId, raw -> objectMapper.readValue(raw, SplitBalanceSummary.class));
        if (cachedBalance.isPresent()) {
            log.debug("⚡ [Redis Cache HIT] Retrieved balance summary for user {} in <1ms", userId);
            return cachedBalance.get();
        }

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
        SplitBalanceSummary summary = new SplitBalanceSummary(
                userId,
                Math.round(paidForOthers * 100.0) / 100.0,
                Math.round(owedToOthers * 100.0) / 100.0,
                net,
                balancesWithFriends
        );

        cache.serializeAndSet(REDIS_KEY_SPLIT_BALANCES_PREFIX + userId, summary,
                objectMapper::writeValueAsString, SPLIT_LEDGER_TTL);

        return summary;
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
