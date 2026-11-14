package com.skills.ai.split;

import java.util.Map;

/**
 * Summary of a user's net debt/credit balances across all group movie expenses.
 */
public record SplitBalanceSummary(
        String userId,
        double totalPaidForOthers,
        double totalOwedToOthers,
        double netBalance,
        Map<String, Double> balancesWithFriends
) {}
