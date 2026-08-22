package com.promoservice.domain.impl;

import com.promoservice.domain.CartContext;
import com.promoservice.domain.ValidationResult;

import java.util.List;

/**
 * Java 21 Record implementation of ValidationResult interface.
 */
public record DefaultValidationResult(
        boolean isValid,
        long originalSubtotalCents,
        long totalDiscountCents,
        long finalPayableCents,
        List<String> appliedPromotionIds,
        List<String> rejectionReasons,
        CartContext modifiedCart
) implements ValidationResult {

    @Override
    public boolean isValid() {
        return isValid;
    }

    @Override
    public long getOriginalSubtotalCents() {
        return originalSubtotalCents;
    }

    @Override
    public long getTotalDiscountCents() {
        return totalDiscountCents;
    }

    @Override
    public long getFinalPayableCents() {
        return finalPayableCents;
    }

    @Override
    public List<String> getAppliedPromotionIds() {
        return appliedPromotionIds != null ? appliedPromotionIds : List.of();
    }

    @Override
    public List<String> getRejectionReasons() {
        return rejectionReasons != null ? rejectionReasons : List.of();
    }

    @Override
    public CartContext getModifiedCart() {
        return modifiedCart;
    }
}
