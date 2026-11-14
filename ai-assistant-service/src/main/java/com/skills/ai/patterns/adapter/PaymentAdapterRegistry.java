package com.skills.ai.patterns.adapter;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Adapter Registry / Strategy Resolver:
 * Discovers and routes to the appropriate PaymentGatewayAdapter at runtime.
 */
@Component
@RequiredArgsConstructor
public class PaymentAdapterRegistry {

    private final List<PaymentGatewayAdapter> adapters;

    public PaymentGatewayAdapter getAdapter(String paymentMethod) {
        if (paymentMethod == null) {
            return adapters.stream()
                    .filter(a -> a instanceof FintechWalletPaymentAdapter)
                    .findFirst()
                    .orElse(adapters.get(0));
        }

        return adapters.stream()
                .filter(a -> a.supports(paymentMethod))
                .findFirst()
                .orElseGet(() -> adapters.stream()
                        .filter(a -> a instanceof ResilientCardPaymentAdapter)
                        .findFirst()
                        .orElse(adapters.get(0)));
    }
}
