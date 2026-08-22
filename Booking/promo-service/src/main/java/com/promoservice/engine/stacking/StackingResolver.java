package com.promoservice.engine.stacking;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.PromotionDefinition;
import com.promoservice.domain.ValidationResult;

import java.util.List;

/**
 * Interface for the Stacking & Resolution Engine.
 * Evaluates candidate promotions, enforces exclusivity & stacking groups, and computes the optimal discount result.
 */
public interface StackingResolver {

    /**
     * Resolves candidate promotions against a cart and actor context.
     *
     * @param candidatePromotions List of active promotion definitions to evaluate.
     * @param cart                Initial cart context.
     * @param actor               Customer / B2B Account context.
     * @return Final ValidationResult detailing applied promotions and final payable amount.
     */
    ValidationResult resolve(List<PromotionDefinition> candidatePromotions, CartContext cart, Actor actor);
}
