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
        seedInitialTraces();
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

    private void seedInitialTraces() {
        // Seed a sample startup trace for immediate UI observability
        String sampleTraceId = "trc-" + UUID.randomUUID().toString().substring(0, 8);
        Instant now = Instant.now().minusSeconds(120);

        List<TraceSpan> spans = List.of(
                new TraceSpan(sampleTraceId, "spn-1", null, "prompt_guard_evaluation", "ai-assistant-service",
                        now, 2, "OK", Map.of("rule", "jailbreak_check", "safe", true)),
                new TraceSpan(sampleTraceId, "spn-2", "spn-1", "cache_lookup", "ai-assistant-service",
                        now.plusMillis(3), 1, "OK", Map.of("cacheKey", "sha256-sample", "hit", false)),
                new TraceSpan(sampleTraceId, "spn-3", "spn-2", "mcp_tool_search_movies", "ai-assistant-service",
                        now.plusMillis(5), 18, "OK", Map.of("query", "Inception", "results", 3)),
                new TraceSpan(sampleTraceId, "spn-4", "spn-2", "vector_embedding_gemini", "ai-assistant-service",
                        now.plusMillis(24), 210, "OK", Map.of("model", "gemini-embedding-001", "dim", 3072)),
                new TraceSpan(sampleTraceId, "spn-5", "spn-4", "vector_similarity_search", "ai-assistant-service",
                        now.plusMillis(235), 4, "OK", Map.of("topK", 3, "topScore", 0.89)),
                new TraceSpan(sampleTraceId, "spn-6", null, "llm_synthesis_groq", "ai-assistant-service",
                        now.plusMillis(240), 38, "OK", Map.of("model", "qwen/qwen3.8-27b", "tokens", 312))
        );

        recordTrace(new TraceRecord(
                sampleTraceId,
                "multi_agent_swarm_execution",
                now,
                280,
                "OK",
                spans.size(),
                spans
        ));
    }
}
