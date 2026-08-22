package com.promoservice.domain.impl;

import com.promoservice.domain.LineItem;
import java.util.Map;

/**
 * Java 21 Record implementation of LineItem interface.
 */
public record DefaultLineItem(
        String itemId,
        String sku,
        String category,
        long unitPriceCents,
        int quantity,
        Map<String, Object> attributes
) implements LineItem {

    @Override
    public String getItemId() {
        return itemId;
    }

    @Override
    public String getSku() {
        return sku;
    }

    @Override
    public String getCategory() {
        return category;
    }

    @Override
    public long getUnitPriceCents() {
        return unitPriceCents;
    }

    @Override
    public int getQuantity() {
        return quantity;
    }

    @Override
    public long getTotalPriceCents() {
        return unitPriceCents * quantity;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes != null ? attributes : Map.of();
    }
}
