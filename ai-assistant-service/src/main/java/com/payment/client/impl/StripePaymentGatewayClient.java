package com.payment.client.impl;

import com.payment.client.PaymentGatewayClient;
import com.payment.dto.PaymentResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StripePaymentGatewayClient implements PaymentGatewayClient {

    private boolean simulateFailure = false;

    public void setSimulateFailure(boolean simulateFailure) {
        this.simulateFailure = simulateFailure;
    }

    public boolean isSimulateFailure() {
        return simulateFailure;
    }

    @Override
    public String getProviderName() {
        return "STRIPE";
    }

    /**
     * TODO Step 1: Add Resilience4j @CircuitBreaker annotation
     * Hint: @CircuitBreaker(name = "stripePaymentService", fallbackMethod = "stripePaymentFallback")
     */
    @CircuitBreaker(name = "stripePaymentService", fallbackMethod = "stripePaymentFallback")
    @Override
    public PaymentResponse processPayment(String bookingId, double amount) {
        if (simulateFailure) {
            System.out.println("[" + Thread.currentThread().getName() + "] External Stripe Gateway Timeout!");
            throw new RuntimeException("Stripe API Timeout (504)");
        }
        System.out.println("[" + Thread.currentThread().getName() + "] Stripe Payment Successful for " + bookingId);
        return new PaymentResponse(true, "TXN-STRIPE-" + UUID.randomUUID(), bookingId, amount, "Payment Captured", "STRIPE");
    }

    /**
     * TODO Step 2: Implement Fallback Method stripePaymentFallback
     * Method signature MUST match: (String bookingId, double amount, Throwable ex)
     */
    public PaymentResponse stripePaymentFallback(String bookingId, double amount, Throwable ex) {
        System.out.println("[" + Thread.currentThread().getName() + "] Stripe Circuit Breaker Fallback Executed: " + ex.getMessage());
        return new PaymentResponse(false, "TXN-FALLBACK-HELD", bookingId, amount, "Stripe Gateway Unhealthy - Ticket Reserved 15m", "STRIPE");
    }
}
