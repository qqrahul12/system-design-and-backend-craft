package com.skills.ai.concessions;

import lombok.Builder;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Record representing an active gourmet concessions order placed by a theater patron.
 */
@Builder
public record ConcessionOrder(
        String orderId,
        List<Map<String, Object>> items,
        double totalAmount,
        String deliverySeat,
        String status, // "PREPARING", "READY_FOR_PICKUP", "DELIVERED_TO_SEAT"
        int estimatedMinutes,
        Instant createdAt
) {}
