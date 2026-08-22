package com.promoservice.engine;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.LineItem;
import com.promoservice.domain.impl.*;
import com.promoservice.engine.action.impl.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ActionPipelineEngineTest {

    private DefaultActionPipelineEngine pipelineEngine;

    @BeforeEach
    void setUp() {
        DefaultActionHandlerRegistry registry = new DefaultActionHandlerRegistry(List.of(
                new PercentageDiscountActionHandler(),
                new FlatDiscountActionHandler(),
                new SlabVolumePricingActionHandler(),
                new FreeShippingActionHandler(),
                new FreeGiftActionHandler()
        ));
        pipelineEngine = new DefaultActionPipelineEngine(registry);
    }

    @Test
    @DisplayName("Chunk 3: Test Percentage Discount Action with Max Cap")
    void testPercentageDiscount() {
        // 20% off up to $30 (3000 cents). Cart subtotal = $200 (20000 cents). 20% = $40 -> Capped at $30.
        ActionDefinition percentageAction = new DefaultActionDefinition(
                "DISCOUNT_PERCENT", 1, Map.of("percentage", 20, "max_discount_cents", 3000)
        );

        CartContext cart = new DefaultCartContext("c1", "t1", "USD", 20000L, 500L, List.of(), Map.of());
        Actor actor = new DefaultActor("u1", "USER", Map.of());

        CartContext result = pipelineEngine.executePipeline(List.of(percentageAction), cart, actor);

        assertEquals(17000L, result.getSubtotalCents()); // 20000 - 3000 cap = 17000
    }

    @Test
    @DisplayName("Chunk 3: Test B2B Wholesale Slab Unit Price Override")
    void testB2BSlabPricing() {
        // Slabs for SKU 'BOLT-99': 100-499 units @ $8.00 (800 cents); 500+ units @ $6.50 (650 cents)
        ActionDefinition slabAction = new DefaultActionDefinition("SLAB_PRICING", 1, Map.of(
                "sku", "BOLT-99",
                "slabs", List.of(
                        Map.of("min_qty", 100, "unit_price_cents", 800),
                        Map.of("min_qty", 500, "unit_price_cents", 650)
                )
        ));

        // B2B Customer orders 600 units at original unit price of $10.00 (1000 cents) -> Original subtotal = $6,000 (600,000 cents)
        LineItem item = new DefaultLineItem("item_1", "BOLT-99", "hardware", 1000L, 600, Map.of());
        CartContext b2bCart = new DefaultCartContext("c_b2b", "tenant_corp", "USD", 600000L, 0L, List.of(item), Map.of());
        Actor actor = new DefaultActor("acc_1", "ACCOUNT", Map.of());

        CartContext result = pipelineEngine.executePipeline(List.of(slabAction), b2bCart, actor);

        // 600 units * $6.50 (650 cents) = $3,900 (390,000 cents)
        assertEquals(390000L, result.getSubtotalCents());
        assertEquals(650L, result.getItems().get(0).getUnitPriceCents());
    }

    @Test
    @DisplayName("Chunk 3: Test Multi-Action Pipeline (Slab Pricing + 10% Discount + Free Shipping + Free Gift)")
    void testMultiActionPipeline() {
        // Order 1: Slab Pricing (600 units of BOLT-99 -> $3,900 subtotal)
        ActionDefinition act1 = new DefaultActionDefinition("SLAB_PRICING", 1, Map.of(
                "sku", "BOLT-99",
                "slabs", List.of(Map.of("min_qty", 500, "unit_price_cents", 650))
        ));

        // Order 2: 10% Additional Discount on new subtotal ($3,900 * 10% = $390 -> new subtotal = $3,510)
        ActionDefinition act2 = new DefaultActionDefinition("DISCOUNT_PERCENT", 2, Map.of("percentage", 10));

        // Order 3: Free Shipping (waive $50 shipping fee)
        ActionDefinition act3 = new DefaultActionDefinition("FREE_SHIPPING", 3, Map.of());

        // Order 4: Add Free Gift SKU 'SAMPLE-TOOL'
        ActionDefinition act4 = new DefaultActionDefinition("ADD_GIFT", 4, Map.of("gift_sku", "SAMPLE-TOOL", "quantity", 1));

        LineItem item = new DefaultLineItem("item_1", "BOLT-99", "hardware", 1000L, 600, Map.of());
        CartContext cart = new DefaultCartContext("c1", "t1", "USD", 600000L, 5000L, List.of(item), Map.of());
        Actor actor = new DefaultActor("u1", "ACCOUNT", Map.of());

        CartContext result = pipelineEngine.executePipeline(List.of(act4, act2, act1, act3), cart, actor); // Passed out-of-order, pipeline sorts by executionOrder!

        assertEquals(351000L, result.getSubtotalCents()); // $3,510
        assertEquals(0L, result.getShippingCents());      // Free shipping
        assertEquals(2, result.getItems().size());          // Original item + Free Gift item
        assertEquals("SAMPLE-TOOL", result.getItems().get(1).getSku());
    }
}
