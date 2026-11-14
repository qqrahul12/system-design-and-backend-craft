package com.skills.ai.telemetry;

import java.time.Instant;
import java.util.Map;

/**
 * OpenTelemetry-compatible span model representing a single unit of work in CineMind.
 */
public record TraceSpan(
        String traceId,
        String spanId,
        String parentSpanId,
        String name,
        String service,
        Instant startTime,
        long durationMs,
        String status, // OK, ERROR, BLOCKED
        Map<String, Object> attributes
) {}
