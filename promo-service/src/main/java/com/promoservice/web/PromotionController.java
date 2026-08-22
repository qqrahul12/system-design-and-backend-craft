package com.promoservice.web;

import com.promoservice.domain.*;
import com.promoservice.domain.impl.*;
import com.promoservice.dto.*;
import com.promoservice.engine.concurrency.ReservationManager;
import com.promoservice.engine.stacking.StackingResolver;
import com.promoservice.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller providing HTTP endpoints for Promo Service.
 */
@RestController
@RequestMapping("/v1/promotions")
public class PromotionController {

    private final StackingResolver stackingResolver;
    private final ReservationManager reservationManager;
    private final PromotionRepository promotionRepository;

    public PromotionController(StackingResolver stackingResolver,
                               @Qualifier("redisLuaReservationManager") ReservationManager reservationManager,
                               PromotionRepository promotionRepository) {
        this.stackingResolver = stackingResolver;
        this.reservationManager = reservationManager;
        this.promotionRepository = promotionRepository;
    }

    /**
     * POST /v1/promotions/validate
     * Evaluates configured tenant active promotions against a cart context and calculates optimal discounts.
     */
    @PostMapping("/validate")
    public ApiResponse<ValidationResult> validateCart(@RequestBody ValidateCartRequest request) {
        String tenantId = TenantContext.getTenantId();
        CartContext cart = request.toCartContext(tenantId);
        Actor actor = request.toActor();

        // Dynamically query configured active promotions for this tenant from Repository
        List<PromotionDefinition> activePromos = promotionRepository.findActivePromotionsByTenantId(tenantId);

        ValidationResult result = stackingResolver.resolve(activePromos, cart, actor);
        return ApiResponse.ok(result);
    }

    /**
     * POST /v1/promotions/reserve
     * Atomically reserves a coupon hold during checkout (Two-Phase Phase 1).
     */
    @PostMapping("/reserve")
    public ApiResponse<ReservationManager.ReservationResult> reservePromo(@RequestBody ReservePromoRequest request) {
        ReservationManager.ReservationResult result = reservationManager.reserve(
                request.promoId(),
                request.actorId(),
                request.maxGlobalLimit() > 0 ? request.maxGlobalLimit() : 100,
                request.maxPerActorLimit() > 0 ? request.maxPerActorLimit() : 1,
                request.ttlSeconds() > 0 ? request.ttlSeconds() : 900
        );

        if (result.success()) {
            return ApiResponse.ok(result);
        } else {
            return ApiResponse.error(result.failureReason());
        }
    }

    /**
     * POST /v1/promotions/complete
     * Commits a promo redemption after payment success (Two-Phase Phase 2).
     */
    @PostMapping("/complete")
    public ApiResponse<String> completeRedemption(@RequestBody CompletePromoRequest request) {
        boolean committed = reservationManager.commit(request.reservationId());
        if (committed) {
            return ApiResponse.ok("Redemption committed for order: " + request.orderId());
        } else {
            return ApiResponse.error("Reservation not found or expired");
        }
    }

    /**
     * POST /v1/promotions/release
     * Rolls back a reservation hold if checkout is canceled.
     */
    @PostMapping("/release")
    public ApiResponse<String> releaseReservation(@RequestParam String reservationId) {
        boolean released = reservationManager.release(reservationId);
        if (released) {
            return ApiResponse.ok("Reservation released");
        } else {
            return ApiResponse.error("Reservation not found");
        }
    }
}
