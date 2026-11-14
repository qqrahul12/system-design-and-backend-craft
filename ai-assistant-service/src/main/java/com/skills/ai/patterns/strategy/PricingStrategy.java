package com.skills.ai.patterns.strategy;

import org.springframework.core.Ordered;

/**
 * Strategy Pattern: Pricing Strategy Interface
 * Encapsulates dynamic yield pricing algorithms (IMAX 70mm, Dolby Atmos, Dynamic Surge, Matinee)
 * allowing them to be swapped dynamically at runtime without modifying client callers (OCP + LSP).
 */
public interface PricingStrategy extends Ordered {

    boolean supports(String format);

    double calculatePrice(double basePrice, String format, boolean isPeakSurge);

    String getStrategyName();

    @Override
    default int getOrder() {
        return 0;
    }
}
