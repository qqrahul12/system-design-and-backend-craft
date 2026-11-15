package com.skills.ai.telemetry;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory distributed trace collector providing real-time APM / waterfall spans
 * for LLM calls, MCP tool dispatches, vector lookups, and security evaluations.
 */
@Slf4j
@Service
public class TraceCollectorService {

    private static final int MAX_TRACES = 100;

    // Ordered deque of trace IDs (newest first)
    private final Deque<String> traceOrder = new ConcurrentLinkedDeque<>();
    private final Map<String, TraceRecord> traceStore = new ConcurrentHashMap<>();

    public TraceCollectorService() {
    }

    public synchronized void recordTrace(TraceRecord record) {
        if (traceStore.containsKey(record.traceId())) {
            traceStore.put(record.traceId(), record);
            return;
        }

        if (traceOrder.size() >= MAX_TRACES) {
            String oldest = traceOrder.pollLast();
            if (oldest != null) {
                traceStore.remove(oldest);
            }
        }

        traceOrder.offerFirst(record.traceId());
        traceStore.put(record.traceId(), record);
        log.debug("Recorded trace: id={}, op={}, spans={}", record.traceId(), record.operationName(), record.spanCount());
    }

    public List<TraceRecord> listTraces() {
        List<TraceRecord> list = new ArrayList<>();
        for (String id : traceOrder) {
            TraceRecord rec = traceStore.get(id);
            if (rec != null) list.add(rec);
        }
        return list;
    }

    public Optional<TraceRecord> getTrace(String traceId) {
        return Optional.ofNullable(traceStore.get(traceId));
    }
}
