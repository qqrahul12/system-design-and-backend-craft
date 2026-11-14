package com.skills.ai.patterns.strategy;

import org.springframework.stereotype.Component;

/**
 * Strategy Pattern Concrete Strategy:
 * Applies standard flat catalog pricing.
 */
@Component
public class StandardCatalogPricingStrategy implements PricingStrategy {

    @Override
    public double calculatePrice(double basePrice, String format, boolean isPeakSurge) {
        double surge = isPeakSurge ? 2.50 : 0.0;
        return Math.round((basePrice + surge) * 100.0) / 100.0;
    }

    @Override
    public String getStrategyName() {
        return "STANDARD_CATALOG";
    }
}
