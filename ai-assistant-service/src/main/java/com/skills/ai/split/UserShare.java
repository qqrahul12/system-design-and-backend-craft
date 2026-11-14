package com.skills.ai.split;

import java.time.Instant;

/**
 * Individual share mapping for a user under a split expense.
 */
public record UserShare(
        String userId,
        String userName,
        double shareAmount,
        boolean isPaid,
        String paymentMethod, // WALLET, STRIPE_CARD, PENDING
        Instant paidAt
) {
    public UserShare withPayment(String method) {
        return new UserShare(userId, userName, shareAmount, true, method, Instant.now());
    }
}
