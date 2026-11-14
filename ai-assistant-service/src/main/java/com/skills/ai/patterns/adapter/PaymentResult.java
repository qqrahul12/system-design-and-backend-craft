package com.skills.ai.patterns.adapter;

import java.time.Instant;

/**
 * Standardized payment result returned across all gateway adapters.
 */
public record PaymentResult(
        boolean success,
        String transactionId,
        String providerName,
        double amount,
        double remainingBalance,
        String message,
        Instant timestamp
) {
    public static PaymentResult success(String txnId, String provider, double amount, double remainingBalance, String msg) {
        return new PaymentResult(true, txnId, provider, amount, remainingBalance, msg, Instant.now());
    }

    public static PaymentResult failure(String provider, double amount, String errorMsg) {
        return new PaymentResult(false, null, provider, amount, 0.0, errorMsg, Instant.now());
    }
}
