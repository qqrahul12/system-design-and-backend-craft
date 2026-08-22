package com.promoservice.domain;

import java.util.List;
import java.util.Map;

/**
 * Interface representing the complete cart context submitted for validation or discount calculation.
 */
public interface CartContext {

    String getCartId();

    String getTenantId();

    String getCurrency();

    long getSubtotalCents();

    long getShippingCents();

    List<LineItem> getItems();

    /**
     * Additional contextual attributes (e.g. promo_code, channel="MOBILE", payment_method="CREDIT_CARD").
     */
    Map<String, Object> getMetadata();

    Object getMetadataAttribute(String key);
}
