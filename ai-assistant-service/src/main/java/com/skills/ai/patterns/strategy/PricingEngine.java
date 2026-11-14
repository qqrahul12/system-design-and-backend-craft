package com.skills.ai.patterns.strategy;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

/**
 * Strategy Pattern: Context Class
 * Holds ordered references to PricingStrategy and resolves the optimal pricing algorithm based on polymorphic support (OCP + LSP).
 */
@Slf4j
@Service
public class PricingEngine {

    private final List<PricingStrategy> strategies;

    public PricingEngine(List<PricingStrategy> strategies) {
        // Sort strategies by precedence order so specialized strategies evaluate before defaults
        this.strategies = strategies.stream()
                .sorted(Comparator.comparingInt(PricingStrategy::getOrder))
                .toList();
    }

    public double computeTicketPrice(double basePrice, String format, boolean isSurgeActive) {
        PricingStrategy strategy = resolveStrategy(format);
        double finalPrice = strategy.calculatePrice(basePrice, format, isSurgeActive);
        log.debug("🎯 [PricingEngine:Strategy={}] Base=${}, Format={}, Surge={} -> Final=${}",
                strategy.getStrategyName(), basePrice, format, isSurgeActive, finalPrice);
        return finalPrice;
    }

    private PricingStrategy resolveStrategy(String format) {
        return strategies.stream()
                .filter(s -> s.supports(format))
                .findFirst()
                .orElse(strategies.get(0));
    }
}
