package com.skills.ai.patterns.adapter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Adapter Pattern Concrete Implementation:
 * Adapts external Stripe payment processing with circuit breaker emulation.
 */
@Slf4j
@Component
public class ResilientCardPaymentAdapter implements PaymentGatewayAdapter {

    @Override
    public PaymentResult processPayment(String orderReference, double amount, String description) {
        log.info("💳 [ResilientCardPaymentAdapter] Executing card capture: amount=${}, orderRef={}", amount, orderReference);
        String txnId = "TXN-STRIPE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return PaymentResult.success(
                txnId,
                getProviderName(),
                amount,
                0.0,
                "Card payment authorized & captured via Stripe Gateway"
        );
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
}
