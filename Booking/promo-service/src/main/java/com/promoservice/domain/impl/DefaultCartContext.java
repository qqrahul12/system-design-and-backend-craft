package com.promoservice.domain.impl;

import com.promoservice.domain.CartContext;
import com.promoservice.domain.LineItem;

import java.util.List;
import java.util.Map;

/**
 * Java 21 Record implementation of CartContext interface.
 */
public record DefaultCartContext(
        String cartId,
        String tenantId,
        String currency,
        long subtotalCents,
        long shippingCents,
        List<LineItem> items,
        Map<String, Object> metadata
) implements CartContext {

    @Override
    public String getCartId() {
        return cartId;
    }

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public String getCurrency() {
        return currency != null ? currency : "USD";
    }

    @Override
    public long getSubtotalCents() {
        return subtotalCents;
    }

    @Override
    public long getShippingCents() {
        return shippingCents;
    }

    @Override
    public List<LineItem> getItems() {
        return items != null ? items : List.of();
    }

    @Override
    public Map<String, Object> getMetadata() {
        return metadata != null ? metadata : Map.of();
    }

    @Override
    public Object getMetadataAttribute(String key) {
        return getMetadata().get(key);
    }
}
