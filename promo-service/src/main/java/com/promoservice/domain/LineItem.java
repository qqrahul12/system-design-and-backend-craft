package com.promoservice.domain;

import java.util.Map;

/**
 * Interface representing an individual item within a shopping cart.
 */
public interface LineItem {

    String getItemId();

    String getSku();

    String getCategory();

    long getUnitPriceCents();

    int getQuantity();

    long getTotalPriceCents();

    /**
     * Line-item level metadata (e.g. brand, supplier, custom attributes).
     */
    Map<String, Object> getAttributes();
}
