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
 * Action Handler applying a percentage discount to the cart subtotal.
 * Supports optional maximum discount cap (e.g., 20% off up to $30).
 */
@Component
public class PercentageDiscountActionHandler implements ActionHandler {

    @Override
    public String getActionType() {
        return "DISCOUNT_PERCENT";
    }

    @Override
    public CartContext apply(ActionDefinition action, CartContext cart, Actor actor) {
        if (action == null || action.getConfig() == null || cart == null) {
            return cart;
        }

        Map<String, Object> config = action.getConfig();
        Object percentageObj = config.get("percentage");
        if (percentageObj == null) {
            return cart;
        }

        double percentage = Double.parseDouble(percentageObj.toString());
        long currentSubtotal = cart.getSubtotalCents();

        long discountCents = Math.round(currentSubtotal * (percentage / 100.0));

        if (config.containsKey("max_discount_cents") && config.get("max_discount_cents") != null) {
            long maxCap = Long.parseLong(config.get("max_discount_cents").toString());
            discountCents = Math.min(discountCents, maxCap);
        }

        long newSubtotal = Math.max(0, currentSubtotal - discountCents);

        Map<String, Object> newMetadata = new HashMap<>(cart.getMetadata());
        long currentTotalDiscount = ((Number) newMetadata.getOrDefault("applied_discount_cents", 0L)).longValue();
        newMetadata.put("applied_discount_cents", currentTotalDiscount + discountCents);

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
