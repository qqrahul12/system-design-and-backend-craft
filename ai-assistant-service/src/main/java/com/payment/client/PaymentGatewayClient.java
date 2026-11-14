package com.payment.client;

import com.payment.dto.PaymentResponse;

public interface PaymentGatewayClient {

    /**
     * Executes payment transaction against external gateway adapter.
     */
    PaymentResponse processPayment(String bookingId, double amount);

    /**
     * Returns payment provider name (e.g. STRIPE, RAZORPAY, PAYTM).
     */
    String getProviderName();
}
