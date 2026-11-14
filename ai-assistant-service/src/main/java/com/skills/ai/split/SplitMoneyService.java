package com.skills.ai.split;

import com.skills.ai.patterns.adapter.PaymentResult;
import com.skills.ai.patterns.adapter.ResilientCardPaymentAdapter;
import com.skills.ai.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Enterprise Service integrating SplitMoney's Group & Expense Engine into CineMind.
 *
 * <p>Supports group creation, equal/exact bill splitting for movie passes & gourmet F&B,
 * and 1-click settlement via Fintech Digital Wallet or Stripe Circuit Breaker Gateway.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SplitMoneyService {

    private final WalletService walletService;
    private final ResilientCardPaymentAdapter cardPaymentAdapter;

    private final Map<String, SplitUser> users = new ConcurrentHashMap<>();
    private final Map<String, SplitGroup> groups = new ConcurrentHashMap<>();
    private final Map<String, SplitExpense> expenses = new ConcurrentHashMap<>();

    // Initialize with standard CineMind patrons and a movie squad group
    {
        seedSquadData();
    }

    private void seedSquadData() {
        SplitUser u1 = new SplitUser("usr-marcus", "Marcus", "Kane", "marcus.kane@cinemind.io", "+1-555-0101", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");
        SplitUser u2 = new SplitUser("usr-alex", "Alex", "Mercer", "alex.mercer@cinemind.io", "+1-555-0102", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150");
        SplitUser u3 = new SplitUser("usr-elena", "Elena", "Rostova", "elena.rostova@cinemind.io", "+1-555-0103", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150");
        SplitUser u4 = new SplitUser("usr-chloe", "Chloe", "Bennett", "chloe.bennett@cinemind.io", "+1-555-0104", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150");

        users.put(u1.id(), u1);
        users.put(u2.id(), u2);
        users.put(u3.id(), u3);
        users.put(u4.id(), u4);

        SplitGroup g1 = new SplitGroup(
                "grp-imax-squad",
                "CineMind IMAX VIP Squad",
                "Weekend film screenings, 70mm re-releases, and gourmet lounge orders.",
                List.of(u1, u2, u3, u4),
                Instant.now().minus(java.time.Duration.ofDays(14))
        );
        groups.put(g1.id(), g1);

        // Seed an initial split expense: 4 Tickets for Dune 2 ($78.00)
        splitBill(
                "Dune: Part Two IMAX 70mm Tickets (4 Passes)",
                78.00,
                u1.id(),
                List.of(u1.id(), u2.id(), u3.id(), u4.id()),
                "MOVIE_TICKET",
                "TKT-DUNE-INIT"
        );
    }

    public List<SplitUser> listUsers() {
        return new ArrayList<>(users.values());
    }

    public Optional<SplitUser> getUser(String id) {
        return Optional.ofNullable(users.get(id));
    }

    public List<SplitGroup> listGroups() {
        return new ArrayList<>(groups.values());
    }

    public Optional<SplitGroup> getGroup(String id) {
        return Optional.ofNullable(groups.get(id));
    }

    public SplitGroup createGroup(String name, String description, List<String> memberUserIds) {
        String groupId = "grp-" + UUID.randomUUID().toString().substring(0, 8);
        List<SplitUser> members = (memberUserIds != null ? memberUserIds : List.<String>of())
                .stream()
                .map(users::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (members.isEmpty()) {
            members = new ArrayList<>(users.values());
        }

        SplitGroup g = new SplitGroup(groupId, name, description, members, Instant.now());
        groups.put(groupId, g);
        log.info("👥 [SplitMoney] Created group '{}' (id={}) with {} members", name, groupId, members.size());
        return g;
    }

    public SplitExpense splitBill(
            String name,
            double totalAmount,
            String paidByUserId,
            List<String> memberUserIds,
            String referenceType,
            String referenceId
    ) {
        SplitUser payer = users.getOrDefault(paidByUserId, users.values().iterator().next());
        List<SplitUser> participants = (memberUserIds != null && !memberUserIds.isEmpty())
                ? memberUserIds.stream().map(users::get).filter(Objects::nonNull).toList()
                : new ArrayList<>(users.values());

        if (participants.isEmpty()) {
            participants = List.of(payer);
        }

        int count = participants.size();
        double equalShare = Math.round((totalAmount / count) * 100.0) / 100.0;

        List<UserShare> shares = new ArrayList<>();
        for (SplitUser user : participants) {
            boolean isPayer = user.id().equals(payer.id());
            shares.add(new UserShare(
                    user.id(),
                    user.getFullName(),
                    equalShare,
                    isPayer, // Host has paid their own share
                    isPayer ? "HOST_DIRECT" : "PENDING",
                    isPayer ? Instant.now() : null
            ));
        }

        String expenseId = "EXP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        SplitExpense expense = new SplitExpense(
                expenseId,
                name,
                totalAmount,
                payer.id(),
                payer.getFullName(),
                SplitExpenseType.EQUAL,
                "grp-imax-squad",
                referenceType != null ? referenceType : "CUSTOM",
                referenceId != null ? referenceId : "REF-GEN",
                shares,
                Instant.now()
        );

        expenses.put(expenseId, expense);
        log.info("💸 [SplitMoney] Split expense '{}' (${}) among {} patrons. Share: ${} each",
                name, totalAmount, count, equalShare);
        return expense;
    }

    public List<SplitExpense> listExpenses() {
        return new ArrayList<>(expenses.values());
    }

    public Optional<SplitExpense> getExpense(String id) {
        return Optional.ofNullable(expenses.get(id));
    }

    /**
     * Settles a friend's share under a split expense using either CineCash Digital Wallet or Stripe Card Gateway.
     */
    public UserShare settleShare(String expenseId, String debtorUserId, String paymentMethod) {
        SplitExpense expense = expenses.get(expenseId);
        if (expense == null) {
            throw new IllegalArgumentException("Expense not found: " + expenseId);
        }

        UserShare targetShare = null;
        int targetIdx = -1;
        for (int i = 0; i < expense.shares().size(); i++) {
            UserShare s = expense.shares().get(i);
            if (s.userId().equals(debtorUserId)) {
                targetShare = s;
                targetIdx = i;
                break;
            }
        }

        if (targetShare == null) {
            throw new IllegalArgumentException("User " + debtorUserId + " is not a participant in expense " + expenseId);
        }

        if (targetShare.isPaid()) {
            return targetShare; // already settled
        }

        String method = (paymentMethod != null && paymentMethod.toUpperCase().contains("CARD")) ? "STRIPE_CARD" : "WALLET";

        if ("WALLET".equals(method)) {
            // Debit from debtor's CineCash wallet balance
            walletService.debit(
                    targetShare.shareAmount(),
                    "SPLIT_BILL_SETTLEMENT",
                    "Settled share for: " + expense.name()
            );
            log.info("💳 Settled ${} for {} via CineCash Wallet", targetShare.shareAmount(), targetShare.userName());
        } else {
            // Execute via StripePaymentGatewayClient through ResilientCardPaymentAdapter
            PaymentResult cardResult = cardPaymentAdapter.processPayment(
                    expenseId + "-" + debtorUserId,
                    targetShare.shareAmount(),
                    "Split settlement for " + expense.name()
            );
            if (!cardResult.success()) {
                throw new IllegalStateException("Card Settlement Gateway Error: " + cardResult.message());
            }
            log.info("💳 Settled ${} for {} via Stripe Circuit Breaker Gateway (txn={})",
                    targetShare.shareAmount(), targetShare.userName(), cardResult.transactionId());
        }

        UserShare settled = targetShare.withPayment(method);
        List<UserShare> updatedShares = new ArrayList<>(expense.shares());
        updatedShares.set(targetIdx, settled);

        SplitExpense updatedExpense = new SplitExpense(
                expense.id(),
                expense.name(),
                expense.totalAmount(),
                expense.paidByUserId(),
                expense.paidByUserName(),
                expense.expenseType(),
                expense.groupId(),
                expense.referenceType(),
                expense.referenceId(),
                updatedShares,
                expense.createdAt()
        );
        expenses.put(expense.id(), updatedExpense);
        return settled;
    }

    /**
     * Calculates net balance sheet for a user across all split group expenses.
     */
    public SplitBalanceSummary getUserBalances(String userId) {
        double paidForOthers = 0.0;
        double owedToOthers = 0.0;
        Map<String, Double> balancesWithFriends = new HashMap<>();

        for (SplitExpense exp : expenses.values()) {
            boolean isPayer = exp.paidByUserId().equals(userId);
            for (UserShare s : exp.shares()) {
                if (isPayer && !s.userId().equals(userId)) {
                    // User paid for this friend
                    if (!s.isPaid()) {
                        paidForOthers += s.shareAmount();
                        balancesWithFriends.merge(s.userName(), s.shareAmount(), Double::sum);
                    }
                } else if (!isPayer && s.userId().equals(userId)) {
                    // User owes the payer
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
}
