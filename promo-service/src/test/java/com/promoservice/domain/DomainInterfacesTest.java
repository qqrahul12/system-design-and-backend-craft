package com.promoservice.domain;

import com.promoservice.domain.impl.*;
import com.promoservice.engine.action.ActionHandler;
import com.promoservice.engine.action.impl.DefaultActionHandlerRegistry;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import com.promoservice.engine.evaluator.impl.DefaultConditionEvaluatorRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DomainInterfacesTest {

    @Test
    @DisplayName("Chunk 1: Verify Domain Interfaces & Java 21 Record Implementations")
    void testDomainInterfaces() {
        // 1. Create B2B / B2C Actor Context
        Actor actor = new DefaultActor("usr_9918", "USER", Map.of("user_tier", "VIP", "region", "EU"));
        assertEquals("usr_9918", actor.getActorId());
        assertEquals("USER", actor.getActorType());
        assertEquals("VIP", actor.getAttribute("user_tier"));

        // 2. Create Cart Context & Line Items
        LineItem item = new DefaultLineItem("item_1", "SKU-99", "electronics", 5000L, 2, Map.of());
        assertEquals(10000L, item.getTotalPriceCents());

        CartContext cart = new DefaultCartContext(
                "cart_1001", "tenant_alpha", "USD", 10000L, 500L, List.of(item), Map.of("channel", "MOBILE")
        );
        assertEquals("cart_1001", cart.getCartId());
        assertEquals("tenant_alpha", cart.getTenantId());
        assertEquals(10000L, cart.getSubtotalCents());

        // 3. Create AST Condition Node & Action Definition
        ConditionNode condition = new DefaultConditionNode("GREATER_THAN", "cart.subtotal_cents", 5000L, List.of());
        assertEquals("GREATER_THAN", condition.getOperator());
        assertFalse(condition.isLogical());

        ActionDefinition action = new DefaultActionDefinition("DISCOUNT_PERCENT", 1, Map.of("percentage", 15));
        assertEquals("DISCOUNT_PERCENT", action.getActionType());

        // 4. Create Promotion Definition
        PromotionDefinition promo = new DefaultPromotionDefinition(
                "promo_summer", "tenant_alpha", "Summer Sale", "AUTOMATIC", null, 1, false,
                "CART_DISCOUNT", condition, List.of(action), Instant.now(), Instant.now().plusSeconds(86400), true
        );
        assertEquals("promo_summer", promo.getPromotionId());
        assertTrue(promo.isActive());
    }

    @Test
    @DisplayName("Chunk 1: Verify Strategy Pattern Registries")
    void testRegistries() {
        // Mock ConditionEvaluator Strategy
        ConditionEvaluator gtEvaluator = new ConditionEvaluator() {
            @Override
            public String getOperator() { return "GREATER_THAN"; }
            @Override
            public boolean evaluate(ConditionNode condition, CartContext cart, Actor actor) { return true; }
        };

        DefaultConditionEvaluatorRegistry evalRegistry = new DefaultConditionEvaluatorRegistry(List.of(gtEvaluator));
        assertNotNull(evalRegistry.getEvaluator("GREATER_THAN"));
        assertNull(evalRegistry.getEvaluator("UNKNOWN_OP"));

        // Mock ActionHandler Strategy
        ActionHandler percentHandler = new ActionHandler() {
            @Override
            public String getActionType() { return "DISCOUNT_PERCENT"; }
            @Override
            public CartContext apply(ActionDefinition action, CartContext cart, Actor actor) { return cart; }
        };

        DefaultActionHandlerRegistry actionRegistry = new DefaultActionHandlerRegistry(List.of(percentHandler));
        assertNotNull(actionRegistry.getHandler("DISCOUNT_PERCENT"));
        assertNull(actionRegistry.getHandler("UNKNOWN_ACTION"));
    }
}
