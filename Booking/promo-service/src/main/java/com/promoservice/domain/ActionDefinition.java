package com.promoservice.domain;

import java.util.Map;

/**
 * Interface representing a specific action/effect to execute when promotion conditions pass.
 */
public interface ActionDefinition {

    /**
     * Action type discriminator (e.g., "DISCOUNT_PERCENT", "DISCOUNT_FLAT", "SLAB_PRICING", "FREE_SHIPPING", "ADD_GIFT").
     */
    String getActionType();

    /**
     * Execution order sequence (e.g., item-level discounts run before cart-level discounts).
     */
    int getExecutionOrder();

    /**
     * Action configuration payload (e.g. {"percentage": 15, "max_discount_cents": 2000}).
     */
    Map<String, Object> getConfig();
}
