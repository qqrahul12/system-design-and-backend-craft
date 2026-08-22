package com.booking.service;

import org.springframework.stereotype.Service;

@Service
public class PaymentGatewayClient {

    private boolean simulateFailure = false;

    public void setSimulateFailure(boolean simulateFailure) {
        this.simulateFailure = simulateFailure;
    }

    /**
     * TODO: Step 1 - Add Resilience4j @CircuitBreaker annotation here!
     * Hint: @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
     */
    public String processPayment(String bookingId, double amount) {
        if (simulateFailure) {
            System.out.println("[" + Thread.currentThread().getName() + "] External Payment Gateway Failure!");
            throw new RuntimeException("Payment Gateway Timeout (504)");
        }
        System.out.println("[" + Thread.currentThread().getName() + "] External Payment Successful for " + bookingId);
        return "SUCCESS:" + bookingId;
    }

    /**
     * TODO: Step 2 - Implement the fallback method paymentFallback!
     * Note: Signature MUST match (String bookingId, double amount, Throwable ex)
     */
}
