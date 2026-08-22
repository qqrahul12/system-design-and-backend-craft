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

/**
 * Action Handler applying B2B Volume Slab Pricing.
 * Overrides unit prices based on total quantity purchased of a given SKU.
 */
@Component
public class SlabVolumePricingActionHandler implements ActionHandler {

    @Override
    public String getActionType() {
        return "SLAB_PRICING";
    }

    @Override
    @SuppressWarnings("unchecked")
    public CartContext apply(ActionDefinition action, CartContext cart, Actor actor) {
        if (action == null || action.getConfig() == null || cart == null || cart.getItems() == null) {
            return cart;
        }

        Map<String, Object> config = action.getConfig();
        String targetSku = (String) config.get("sku");
        List<Map<String, Object>> slabs = (List<Map<String, Object>>) config.get("slabs");

        if (targetSku == null || slabs == null || slabs.isEmpty()) {
            return cart;
        }

        // Calculate total SKU quantity
        int totalQuantity = cart.getItems().stream()
                .filter(item -> targetSku.equalsIgnoreCase(item.getSku()))
                .mapToInt(LineItem::getQuantity)
                .sum();

        if (totalQuantity == 0) {
            return cart;
        }

        // Find applicable slab (matching highest min_qty <= totalQuantity)
        Long overrideUnitPriceCents = null;
        int highestMatchedQty = -1;

        for (Map<String, Object> slab : slabs) {
            int minQty = Integer.parseInt(slab.get("min_qty").toString());
            long unitPriceCents = Long.parseLong(slab.get("unit_price_cents").toString());

            if (totalQuantity >= minQty && minQty > highestMatchedQty) {
                highestMatchedQty = minQty;
                overrideUnitPriceCents = unitPriceCents;
            }
        }

        if (overrideUnitPriceCents == null) {
            return cart; // No slab matched
        }

        final long newPrice = overrideUnitPriceCents;
        List<LineItem> updatedItems = new ArrayList<>();
        long newSubtotal = 0;

        for (LineItem item : cart.getItems()) {
            if (targetSku.equalsIgnoreCase(item.getSku())) {
                LineItem updated = new DefaultLineItem(
                        item.getItemId(), item.getSku(), item.getCategory(),
                        newPrice, item.getQuantity(), item.getAttributes()
                );
                updatedItems.add(updated);
                newSubtotal += updated.getTotalPriceCents();
            } else {
                updatedItems.add(item);
                newSubtotal += item.getTotalPriceCents();
            }
        }

        return new DefaultCartContext(
                cart.getCartId(),
                cart.getTenantId(),
                cart.getCurrency(),
                newSubtotal,
                cart.getShippingCents(),
                updatedItems,
                cart.getMetadata()
        );
    }
}
