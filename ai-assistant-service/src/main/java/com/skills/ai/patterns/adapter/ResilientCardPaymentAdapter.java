package com.skills.ai.patterns.adapter;

import com.payment.client.PaymentGatewayClient;
import com.payment.dto.PaymentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * Adapter Pattern Concrete Implementation:
 * Adapts PaymentGatewayClient abstraction with Resilience4j circuit breaker protection (DIP + LSP).
 */
@Slf4j
@Component
public class ResilientCardPaymentAdapter implements PaymentGatewayAdapter {

    private final PaymentGatewayClient paymentClient;

    public ResilientCardPaymentAdapter(@Qualifier("stripePaymentGatewayClient") PaymentGatewayClient paymentClient) {
        this.paymentClient = paymentClient;
    }

    @Override
    public PaymentResult processPayment(String orderReference, double amount, String description) {
        log.info("💳 [ResilientCardPaymentAdapter] Executing card capture via PaymentGatewayClient: amount=${}, orderRef={}", amount, orderReference);
        try {
            PaymentResponse response = paymentClient.processPayment(orderReference, amount);
            if (response.success()) {
                return PaymentResult.success(
                        response.transactionId(),
                        response.providerName(),
                        amount,
                        0.0,
                        response.statusMessage()
                );
            } else {
                // Circuit breaker fallback executed by Resilience4j
                log.warn("⚠️ [ResilientCardPaymentAdapter] Stripe Circuit Breaker fallback activated: {}", response.statusMessage());
                return PaymentResult.failure(
                        response.providerName(),
                        amount,
                        "Circuit Breaker Protected: " + response.statusMessage()
                );
            }
        } catch (Exception e) {
            log.error("❌ [ResilientCardPaymentAdapter] Stripe payment failure: {}", e.getMessage());
            return PaymentResult.failure(getProviderName(), amount, "Card payment error: " + e.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "STRIPE_CARD";
    }

    @Override
    public boolean supports(String paymentMethod) {
        if (paymentMethod == null) return false;
        String m = paymentMethod.toUpperCase();
        return m.contains("CARD") || m.contains("STRIPE") || m.contains("CREDIT");
    }

    private boolean simulateFailure = false;

    public void setSimulateFailure(boolean simulateFailure) {
        this.simulateFailure = simulateFailure;
        paymentClient.setSimulateFailure(simulateFailure);
    }

    public boolean isSimulateFailure() {
        return simulateFailure;
    }
}
