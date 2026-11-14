package com.payment.dto;

public record PaymentResponse(
        boolean success,
        String transactionId,
        String bookingId,
        double amount,
        String statusMessage,
        String providerName
) {}
