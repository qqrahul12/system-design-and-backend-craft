package com.skills.ai.patterns.strategy;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Strategy Pattern: Context Class
 * Holds a reference to PricingStrategy and resolves the optimal pricing algorithm based on runtime context.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PricingEngine {

    private final List<PricingStrategy> strategies;

    public double computeTicketPrice(double basePrice, String format, boolean isSurgeActive) {
        PricingStrategy strategy = resolveStrategy(format);
        double finalPrice = strategy.calculatePrice(basePrice, format, isSurgeActive);
        log.debug("🎯 [PricingEngine:Strategy={}] Base=${}, Format={}, Surge={} -> Final=${}",
                strategy.getStrategyName(), basePrice, format, isSurgeActive, finalPrice);
        return finalPrice;
    }

    private PricingStrategy resolveStrategy(String format) {
        if (format != null && (format.toUpperCase().contains("IMAX") || format.toUpperCase().contains("DOLBY"))) {
            return strategies.stream()
                    .filter(s -> s instanceof ImaxLargeFormatStrategy)
                    .findFirst()
                    .orElse(strategies.get(0));
        }
        return strategies.stream()
                .filter(s -> s instanceof StandardCatalogPricingStrategy)
                .findFirst()
                .orElse(strategies.get(0));
    }
}
