package com.promoservice.domain;

import java.util.List;

/**
 * Interface representing the result of evaluating promotions against a cart context.
 */
public interface ValidationResult {

    boolean isValid();

    long getOriginalSubtotalCents();

    long getTotalDiscountCents();

    long getFinalPayableCents();

    List<String> getAppliedPromotionIds();

    List<String> getRejectionReasons();

    CartContext getModifiedCart();
}
