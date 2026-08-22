package com.promoservice.dto;

/**
 * Request payload for committing a promo redemption after payment.
 */
public record CompletePromoRequest(
        String reservationId,
        String orderId
) {}
