package com.skills.ai.patterns.strategy;

import org.springframework.stereotype.Component;

/**
 * Strategy Pattern Concrete Strategy:
 * Applies 1.25x premium multiplier for IMAX 70mm and Dolby Cinema auditoriums.
 */
@Component
public class ImaxLargeFormatStrategy implements PricingStrategy {

    @Override
    public double calculatePrice(double basePrice, String format, boolean isPeakSurge) {
        double multiplier = (format != null && (format.toUpperCase().contains("IMAX") || format.toUpperCase().contains("DOLBY")))
                ? 1.25 : 1.0;
        double surge = isPeakSurge ? 2.50 : 0.0;
        return Math.round((basePrice * multiplier + surge) * 100.0) / 100.0;
    }

    @Override
    public String getStrategyName() {
        return "IMAX_LARGE_FORMAT_PREMIUM";
    }
}
