package com.skills.ai.telemetry;

import java.time.Instant;
import java.util.List;

/**
 * End-to-end execution trace record aggregating all child spans for waterfall visualization.
 */
public record TraceRecord(
        String traceId,
        String operationName,
        Instant startTime,
        long totalDurationMs,
        String status,
        int spanCount,
        List<TraceSpan> spans
) {}
