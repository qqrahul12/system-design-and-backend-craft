package com.skills.ai.agent;

import java.time.Instant;
import java.util.Map;

/**
 * Encapsulates a single execution event within a multi-agent orchestration trace.
 */
public record AgentExecutionStep(
        int stepIndex,
        String agentId,
        String agentName,
        String avatar,
        String action,
        String thought,
        String toolName,
        Map<String, Object> toolInput,
        String toolOutput,
        boolean isError,
        long durationMs,
        Instant timestamp
) {}
