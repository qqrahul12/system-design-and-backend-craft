package com.promoservice.engine.action.impl;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.impl.DefaultCartContext;
import com.promoservice.engine.action.ActionHandler;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Action Handler applying a flat dollar discount to the cart subtotal.
 */
@Component
public class FlatDiscountActionHandler implements ActionHandler {

    @Override
    public String getActionType() {
        return "DISCOUNT_FLAT";
    }

    @Override
    public CartContext apply(ActionDefinition action, CartContext cart, Actor actor) {
        if (action == null || action.getConfig() == null || cart == null) {
            return cart;
        }

        Map<String, Object> config = action.getConfig();
        Object discountObj = config.get("discount_cents");
        if (discountObj == null) {
            return cart;
        }

        long discountCents = Long.parseLong(discountObj.toString());
        long currentSubtotal = cart.getSubtotalCents();

        long actualDiscount = Math.min(currentSubtotal, discountCents);
        long newSubtotal = Math.max(0, currentSubtotal - actualDiscount);

        Map<String, Object> newMetadata = new HashMap<>(cart.getMetadata());
        long currentTotalDiscount = ((Number) newMetadata.getOrDefault("applied_discount_cents", 0L)).longValue();
        newMetadata.put("applied_discount_cents", currentTotalDiscount + actualDiscount);

        return new DefaultCartContext(
                cart.getCartId(),
                cart.getTenantId(),
                cart.getCurrency(),
                newSubtotal,
                cart.getShippingCents(),
                cart.getItems(),
                newMetadata
        );
    }
}
