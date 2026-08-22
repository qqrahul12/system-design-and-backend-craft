package com.promoservice.engine.action.impl;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.impl.DefaultCartContext;
import com.promoservice.engine.action.ActionHandler;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Action Handler waiving or discounting shipping fees.
 */
@Component
public class FreeShippingActionHandler implements ActionHandler {

    @Override
    public String getActionType() {
        return "FREE_SHIPPING";
    }

    @Override
    public CartContext apply(ActionDefinition action, CartContext cart, Actor actor) {
        if (cart == null) {
            return null;
        }

        long currentShipping = cart.getShippingCents();
        if (currentShipping == 0) {
            return cart;
        }

        long newShipping = 0;
        if (action != null && action.getConfig() != null && action.getConfig().containsKey("max_shipping_cents")) {
            long maxWaiver = Long.parseLong(action.getConfig().get("max_shipping_cents").toString());
            newShipping = Math.max(0, currentShipping - maxWaiver);
        }

        return new DefaultCartContext(
                cart.getCartId(),
                cart.getTenantId(),
                cart.getCurrency(),
                cart.getSubtotalCents(),
                newShipping,
                cart.getItems(),
                cart.getMetadata()
        );
    }
}
