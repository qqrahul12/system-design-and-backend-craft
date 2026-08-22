package com.promoservice.engine.stacking.impl;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.PromotionDefinition;
import com.promoservice.domain.ValidationResult;
import com.promoservice.domain.impl.DefaultValidationResult;
import com.promoservice.engine.action.ActionPipelineEngine;
import com.promoservice.engine.evaluator.ASTRuleEngine;
import com.promoservice.engine.stacking.StackingResolver;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service implementation of Stacking & Best Deal Resolution Engine.
 * Evaluates rules via ASTRuleEngine, handles exclusivity, groups promos by stacking group,
 * and executes winning action pipelines via ActionPipelineEngine.
 */
@Service
public class DefaultStackingResolver implements StackingResolver {

    private final ASTRuleEngine astRuleEngine;
    private final ActionPipelineEngine actionPipelineEngine;

    public DefaultStackingResolver(ASTRuleEngine astRuleEngine, ActionPipelineEngine actionPipelineEngine) {
        this.astRuleEngine = astRuleEngine;
        this.actionPipelineEngine = actionPipelineEngine;
    }

    @Override
    public ValidationResult resolve(List<PromotionDefinition> candidatePromotions, CartContext cart, Actor actor) {
        if (cart == null) {
            return new DefaultValidationResult(false, 0, 0, 0, List.of(), List.of("Cart is null"), null);
        }

        long originalSubtotal = cart.getSubtotalCents();
        long originalShipping = cart.getShippingCents();
        long originalTotalPayable = originalSubtotal + originalShipping;

        if (candidatePromotions == null || candidatePromotions.isEmpty()) {
            return new DefaultValidationResult(true, originalSubtotal, 0, originalTotalPayable, List.of(), List.of(), cart);
        }

        // 1. Filter qualified promotions using ASTRuleEngine
        List<PromotionDefinition> qualifiedPromos = candidatePromotions.stream()
                .filter(PromotionDefinition::isActive)
                .filter(p -> astRuleEngine.evaluate(p.getConditionRoot(), cart, actor))
                .toList();

        if (qualifiedPromos.isEmpty()) {
            return new DefaultValidationResult(true, originalSubtotal, 0, originalTotalPayable, List.of(), List.of("No conditions passed"), cart);
        }

        // 2. Separate Exclusive vs Combinable Promos
        List<PromotionDefinition> exclusivePromos = qualifiedPromos.stream()
                .filter(PromotionDefinition::isExclusive)
                .toList();

        List<PromotionDefinition> combinablePromos = qualifiedPromos.stream()
                .filter(p -> !p.isExclusive())
                .toList();

        // Option A: Evaluate Best Exclusive Promo
        PromotionOption bestExclusiveOption = null;
        for (PromotionDefinition exclusive : exclusivePromos) {
            CartContext transformed = actionPipelineEngine.executePipeline(exclusive.getActions(), cart, actor);
            long discount = calculateTotalDiscount(cart, transformed);
            if (bestExclusiveOption == null || discount > bestExclusiveOption.discountCents()) {
                bestExclusiveOption = new PromotionOption(List.of(exclusive.getPromotionId()), discount, transformed);
            }
        }

        // Option B: Evaluate Combinable Promos (Group by Stacking Group -> Pick best in each group)
        PromotionOption combinableOption = evaluateCombinableSet(combinablePromos, cart, actor);

        // 3. Select Winner (Exclusive vs Combinable)
        PromotionOption winner = null;
        if (bestExclusiveOption != null && combinableOption != null) {
            winner = (bestExclusiveOption.discountCents() >= combinableOption.discountCents()) ? bestExclusiveOption : combinableOption;
        } else if (bestExclusiveOption != null) {
            winner = bestExclusiveOption;
        } else {
            winner = combinableOption;
        }

        if (winner == null || winner.appliedIds().isEmpty()) {
            return new DefaultValidationResult(true, originalSubtotal, 0, originalTotalPayable, List.of(), List.of(), cart);
        }

        CartContext finalCart = winner.finalCart();
        long finalPayable = finalCart.getSubtotalCents() + finalCart.getShippingCents();
        long totalDiscount = originalTotalPayable - finalPayable;

        return new DefaultValidationResult(
                true,
                originalSubtotal,
                Math.max(0, totalDiscount),
                Math.max(0, finalPayable),
                winner.appliedIds(),
                List.of(),
                finalCart
        );
    }

    private PromotionOption evaluateCombinableSet(List<PromotionDefinition> combinablePromos, CartContext cart, Actor actor) {
        if (combinablePromos == null || combinablePromos.isEmpty()) {
            return null;
        }

        // Group by Stacking Group (e.g. ITEM_DISCOUNT, CART_DISCOUNT, SHIPPING)
        Map<String, List<PromotionDefinition>> groupMap = new HashMap<>();
        for (PromotionDefinition promo : combinablePromos) {
            String group = (promo.getStackingGroup() != null) ? promo.getStackingGroup().toUpperCase() : "GENERAL";
            groupMap.computeIfAbsent(group, k -> new ArrayList<>()).add(promo);
        }

        // Pick highest priority / best promo from each stacking group
        List<PromotionDefinition> selectedPromos = new ArrayList<>();
        for (List<PromotionDefinition> groupPromos : groupMap.values()) {
            // Sort by priority descending
            groupPromos.sort(Comparator.comparingInt(PromotionDefinition::getPriority).reversed());
            selectedPromos.add(groupPromos.get(0)); // Select highest priority promo in group
        }

        // Collect all action definitions ordered by execution order
        List<ActionDefinition> combinedActions = new ArrayList<>();
        List<String> appliedIds = new ArrayList<>();
        for (PromotionDefinition promo : selectedPromos) {
            appliedIds.add(promo.getPromotionId());
            if (promo.getActions() != null) {
                combinedActions.addAll(promo.getActions());
            }
        }

        CartContext finalCart = actionPipelineEngine.executePipeline(combinedActions, cart, actor);
        long discount = calculateTotalDiscount(cart, finalCart);

        return new PromotionOption(appliedIds, discount, finalCart);
    }

    private long calculateTotalDiscount(CartContext initial, CartContext finalCart) {
        long initialTotal = initial.getSubtotalCents() + initial.getShippingCents();
        long finalTotal = finalCart.getSubtotalCents() + finalCart.getShippingCents();
        return Math.max(0, initialTotal - finalTotal);
    }

    private record PromotionOption(List<String> appliedIds, long discountCents, CartContext finalCart) {}
}
