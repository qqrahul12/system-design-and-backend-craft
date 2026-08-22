package com.promoservice.dto;

/**
 * Request payload for reserving a promo code.
 */
public record ReservePromoRequest(
        String promoId,
        String actorId,
        int maxGlobalLimit,
        int maxPerActorLimit,
        long ttlSeconds
) {}
