package com.promoservice.engine.action;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;

/**
 * Strategy Pattern Interface for Action / Effect Handlers.
 * Every action type (e.g. DISCOUNT_PERCENT, SLAB_PRICING, FREE_SHIPPING) implements this interface.
 */
public interface ActionHandler {

    /**
     * Unique action type discriminator supported by this handler (e.g., "DISCOUNT_PERCENT").
     */
    String getActionType();

    /**
     * Applies the action effect to the cart context and returns a modified CartContext.
     *
     * @param action The action configuration.
     * @param cart   The current cart context before action.
     * @param actor  The customer or B2B account context.
     * @return The updated CartContext reflecting the effect.
     */
    CartContext apply(ActionDefinition action, CartContext cart, Actor actor);
}
