package com.promoservice.engine.concurrency;

import com.promoservice.domain.CartContext;

/**
 * Interface for High-Concurrency Promotion Reservation & Claim Management.
 */
public interface ReservationManager {

    /**
     * Attempts to reserve a promotion for a user/account under concurrency constraints.
     *
     * @param promoId          Promotion ID.
     * @param actorId          User ID (B2C) or Account ID (B2B).
     * @param maxGlobalLimit   Maximum global redemptions allowed (e.g. 100).
     * @param maxPerActorLimit Maximum redemptions per user/account (e.g. 1).
     * @param ttlSeconds       Hold reservation TTL (e.g. 900s / 15 mins).
     * @return ReservationResult containing success status and reservationId.
     */
    ReservationResult reserve(String promoId, String actorId, int maxGlobalLimit, int maxPerActorLimit, long ttlSeconds);

    /**
     * Confirms/Commits a reservation after payment succeeds.
     */
    boolean commit(String reservationId);

    /**
     * Releases/Rolls back a reservation on cancellation or timeout.
     */
    boolean release(String reservationId);

    /**
     * Returns current redemption count for a promo.
     */
    int getCurrentCount(String promoId);

    record ReservationResult(boolean success, String reservationId, String failureReason) {}
}
