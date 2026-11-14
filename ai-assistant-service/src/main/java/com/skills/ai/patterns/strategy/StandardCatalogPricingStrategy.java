package com.skills.ai.patterns.strategy;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Strategy Pattern Concrete Strategy:
 * Applies standard flat catalog pricing. Acts as default fallback strategy.
 */
@Order(Ordered.LOWEST_PRECEDENCE)
@Component
public class StandardCatalogPricingStrategy implements PricingStrategy {

    @Override
    public boolean supports(String format) {
        return true;
    }

    @Override
    public double calculatePrice(double basePrice, String format, boolean isPeakSurge) {
        double surge = isPeakSurge ? 2.50 : 0.0;
        return Math.round((basePrice + surge) * 100.0) / 100.0;
    }

    @Override
    public String getStrategyName() {
        return "STANDARD_CATALOG";
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
