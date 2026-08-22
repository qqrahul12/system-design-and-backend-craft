package com.promoservice.engine;

import com.promoservice.domain.*;
import com.promoservice.domain.impl.*;
import com.promoservice.engine.action.impl.*;
import com.promoservice.engine.evaluator.impl.*;
import com.promoservice.engine.stacking.impl.DefaultStackingResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class StackingResolverTest {

    private DefaultStackingResolver stackingResolver;

    @BeforeEach
    void setUp() {
        // Wire up AST Rule Engine
        DefaultConditionEvaluatorRegistry evalRegistry = new DefaultConditionEvaluatorRegistry(List.of(
                new GtConditionEvaluator(),
                new EqConditionEvaluator()
        ));
        DefaultASTRuleEngine ruleEngine = new DefaultASTRuleEngine(evalRegistry);

        // Wire up Action Pipeline Engine
        DefaultActionHandlerRegistry actionRegistry = new DefaultActionHandlerRegistry(List.of(
                new PercentageDiscountActionHandler(),
                new FlatDiscountActionHandler(),
                new FreeShippingActionHandler()
        ));
        DefaultActionPipelineEngine pipelineEngine = new DefaultActionPipelineEngine(actionRegistry);

        stackingResolver = new DefaultStackingResolver(ruleEngine, pipelineEngine);
    }

    @Test
    @DisplayName("Chunk 4: Exclusive Promo Wins when Savings Exceed Combinable Set")
    void testExclusivePromoWins() {
        // Promo 1: Exclusive 50% Off Coupon (isExclusive = true)
        PromotionDefinition exclusivePromo = new DefaultPromotionDefinition(
                "p_exclusive_50", "tenant1", "Exclusive VIP 50%", "CODE_REQUIRED", "VIP50",
                10, true, "EXCLUSIVE_GROUP",
                new DefaultConditionNode("GREATER_THAN", "cart.subtotal_cents", 10000L, null),
                List.of(new DefaultActionDefinition("DISCOUNT_PERCENT", 1, Map.of("percentage", 50))),
                null, null, true
        );

        // Promo 2: Combinable $10 Flat Off (isExclusive = false)
        PromotionDefinition combinablePromo1 = new DefaultPromotionDefinition(
                "p_comb_10", "tenant1", "Flat $10 Off", "AUTOMATIC", null,
                1, false, "CART_DISCOUNT",
                new DefaultConditionNode("GREATER_THAN", "cart.subtotal_cents", 10000L, null),
                List.of(new DefaultActionDefinition("DISCOUNT_FLAT", 1, Map.of("discount_cents", 1000))),
                null, null, true
        );

        // Promo 3: Combinable Free Shipping (isExclusive = false)
        PromotionDefinition combinablePromo2 = new DefaultPromotionDefinition(
                "p_comb_ship", "tenant1", "Free Shipping", "AUTOMATIC", null,
                1, false, "SHIPPING",
                new DefaultConditionNode("GREATER_THAN", "cart.subtotal_cents", 10000L, null),
                List.of(new DefaultActionDefinition("FREE_SHIPPING", 2, Map.of())),
                null, null, true
        );

        CartContext cart = new DefaultCartContext("c1", "tenant1", "USD", 20000L, 1000L, List.of(), Map.of()); // Subtotal $200, Shipping $10
        Actor actor = new DefaultActor("u1", "USER", Map.of());

        ValidationResult result = stackingResolver.resolve(List.of(exclusivePromo, combinablePromo1, combinablePromo2), cart, actor);

        assertTrue(result.isValid());
        // Exclusive promo gives $100 off ($200 subtotal * 50%). Combinable gives $10 + $10 shipping = $20 off.
        // Exclusive wins!
        assertEquals(1, result.getAppliedPromotionIds().size());
        assertEquals("p_exclusive_50", result.getAppliedPromotionIds().get(0));
        assertEquals(10000L, result.getTotalDiscountCents()); // $100 savings
        assertEquals(11000L, result.getFinalPayableCents());  // $100 subtotal + $10 shipping = $110 (11000 cents)
    }

    @Test
    @DisplayName("Chunk 4: Combinable Promos across Stacking Groups (CART_DISCOUNT + SHIPPING)")
    void testCombinableStackingGroups() {
        // Promo A: 20% Off Cart (Stacking Group: CART_DISCOUNT)
        PromotionDefinition promoCart = new DefaultPromotionDefinition(
                "p_cart_20", "tenant1", "20% Off Cart", "AUTOMATIC", null,
                5, false, "CART_DISCOUNT",
                null, // No conditions (always passes)
                List.of(new DefaultActionDefinition("DISCOUNT_PERCENT", 1, Map.of("percentage", 20))),
                null, null, true
        );

        // Promo B: Free Shipping (Stacking Group: SHIPPING)
        PromotionDefinition promoShip = new DefaultPromotionDefinition(
                "p_free_ship", "tenant1", "Free Shipping", "AUTOMATIC", null,
                1, false, "SHIPPING",
                null,
                List.of(new DefaultActionDefinition("FREE_SHIPPING", 2, Map.of())),
                null, null, true
        );

        CartContext cart = new DefaultCartContext("c1", "tenant1", "USD", 10000L, 1500L, List.of(), Map.of()); // Subtotal $100, Shipping $15
        Actor actor = new DefaultActor("u1", "USER", Map.of());

        ValidationResult result = stackingResolver.resolve(List.of(promoCart, promoShip), cart, actor);

        assertTrue(result.isValid());
        assertEquals(2, result.getAppliedPromotionIds().size());
        assertTrue(result.getAppliedPromotionIds().contains("p_cart_20"));
        assertTrue(result.getAppliedPromotionIds().contains("p_free_ship"));

        // 20% off $100 = $20 discount. Free shipping = $15 discount. Total savings = $35 (3500 cents).
        assertEquals(3500L, result.getTotalDiscountCents());
        assertEquals(8000L, result.getFinalPayableCents()); // Final payable: $80 subtotal + $0 shipping = $80 (8000 cents)
    }
}
