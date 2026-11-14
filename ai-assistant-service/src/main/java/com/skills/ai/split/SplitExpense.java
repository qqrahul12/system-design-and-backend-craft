package com.skills.ai.split;

import java.time.Instant;
import java.util.List;

/**
 * SplitMoney expense entity representing a group transaction (movie tickets or concessions).
 */
public record SplitExpense(
        String id,
        String name,
        double totalAmount,
        String paidByUserId,
        String paidByUserName,
        SplitExpenseType expenseType,
        String groupId,
        String referenceType, // MOVIE_TICKET, CONCESSION_ORDER
        String referenceId,   // e.g. TKT-..., FB-...
        List<UserShare> shares,
        Instant createdAt
) {}
