package com.skills.ai.split;

import java.util.List;
import java.util.Optional;

/**
 * Interface contract for CineMind's SplitMoney Squad & Expense Engine.
 * Supports squad group creation, bill splitting for passes & concessions, and settlement.
 * Adheres to Dependency Inversion (DIP) and Interface Segregation (ISP).
 */
public interface SplitMoneyService {

    List<SplitUser> listUsers();

    Optional<SplitUser> getUser(String id);

    List<SplitGroup> listGroups();

    Optional<SplitGroup> getGroup(String id);

    SplitGroup createGroup(String name, String description, List<String> memberUserIds);

    SplitExpense splitBill(
            String name,
            double totalAmount,
            String paidByUserId,
            List<String> memberUserIds,
            String referenceType,
            String referenceId
    );

    List<SplitExpense> listExpenses();

    Optional<SplitExpense> getExpense(String id);

    UserShare settleShare(String expenseId, String debtorUserId, String paymentMethod);

    SplitBalanceSummary getUserBalances(String userId);
}
