package com.skills.ai.patterns.adapter;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Adapter Registry / Strategy Resolver:
 * Discovers and routes to the appropriate PaymentGatewayAdapter at runtime adhering strictly
 * to the Open/Closed Principle (OCP) and Liskov Substitution Principle (LSP) without instanceof downcasting.
 */
@Component
@RequiredArgsConstructor
public class PaymentAdapterRegistry {

    private final List<PaymentGatewayAdapter> adapters;

    public PaymentGatewayAdapter getAdapter(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return adapters.stream()
                    .filter(a -> a.supports("WALLET"))
                    .findFirst()
                    .orElseGet(() -> adapters.get(0));
        }

        return adapters.stream()
                .filter(a -> a.supports(paymentMethod))
                .findFirst()
                .orElseGet(() -> adapters.stream()
                        .filter(a -> a.supports("CARD"))
                        .findFirst()
                        .orElseGet(() -> adapters.get(0)));
    }
}
