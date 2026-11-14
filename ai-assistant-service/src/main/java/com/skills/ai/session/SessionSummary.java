package com.skills.ai.session;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Encapsulates a multi-turn chat or agent orchestration session.
 */
public record SessionSummary(
        String sessionId,
        String title,
        String type, // CHAT, SWARM_ORCHESTRATION
        Instant createdAt,
        Instant lastActiveAt,
        int interactionCount,
        String lastPreview,
        List<Map<String, Object>> events
) {}
