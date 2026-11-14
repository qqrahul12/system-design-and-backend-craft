package com.skills.ai.patterns.strategy;

/**
 * Strategy Pattern: Pricing Strategy Interface
 * Encapsulates dynamic yield pricing algorithms (IMAX 70mm, Dolby Atmos, Dynamic Surge, Matinee)
 * allowing them to be swapped dynamically at runtime without modifying client callers.
 */
public interface PricingStrategy {

    double calculatePrice(double basePrice, String format, boolean isPeakSurge);

    String getStrategyName();
}
