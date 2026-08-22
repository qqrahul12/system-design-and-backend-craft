package com.promoservice.engine.action.impl;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.LineItem;
import com.promoservice.domain.impl.DefaultCartContext;
import com.promoservice.domain.impl.DefaultLineItem;
import com.promoservice.engine.action.ActionHandler;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Action Handler injecting a $0 Free Gift line item into the cart.
 */
@Component
public class FreeGiftActionHandler implements ActionHandler {

    @Override
    public String getActionType() {
        return "ADD_GIFT";
    }

    @Override
    public CartContext apply(ActionDefinition action, CartContext cart, Actor actor) {
        if (action == null || action.getConfig() == null || cart == null) {
            return cart;
        }

        Map<String, Object> config = action.getConfig();
        String giftSku = (String) config.get("gift_sku");
        int quantity = Integer.parseInt(config.getOrDefault("quantity", 1).toString());

        if (giftSku == null) {
            return cart;
        }

        List<LineItem> newItems = new ArrayList<>(cart.getItems());
        LineItem giftItem = new DefaultLineItem(
                "gift_" + UUID.randomUUID().toString().substring(0, 8),
                giftSku,
                "gift",
                0L, // $0 gift
                quantity,
                Map.of("is_free_gift", true)
        );
        newItems.add(giftItem);

        return new DefaultCartContext(
                cart.getCartId(),
                cart.getTenantId(),
                cart.getCurrency(),
                cart.getSubtotalCents(),
                cart.getShippingCents(),
                newItems,
                cart.getMetadata()
        );
    }
}
