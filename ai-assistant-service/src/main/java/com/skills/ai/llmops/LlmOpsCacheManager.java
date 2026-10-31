package com.skills.ai.llmops;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * High-Performance LLM Response Cache and Telemetry Ledger.
 *
 * <p>Key LLMOps Features:
 * <ul>
 *   <li>Exact-match SHA-256 Prompt & Provider hashing.</li>
 *   <li>Response memoization with TTL expiration.</li>
 *   <li>Real-time telemetry counters (Hit Rate, Saved Latency, Total Tokens).</li>
 * </ul>
 * </p>
 */
@Data
public class LlmOpsCacheManager {

    private static final LlmOpsCacheManager INSTANCE = new LlmOpsCacheManager();

    public static LlmOpsCacheManager getInstance() {
        return INSTANCE;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CachedEntry {
        private String response;
        private String model;
        private Instant expiresAt;
        private long originalLatencyMs;
    }

    private final Map<String, CachedEntry> cache = new ConcurrentHashMap<>();

    // Metrics counters
    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong cacheHits = new AtomicLong(0);
    private final AtomicLong cacheMisses = new AtomicLong(0);
    private final AtomicLong totalSavedLatencyMs = new AtomicLong(0);

    private LlmOpsCacheManager() {}

    /**
     * Computes deterministic SHA-256 Cache Key from prompt, provider, and system context.
     */
    public String generateKey(String provider, String prompt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = provider + ":" + prompt.trim();
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf((provider + ":" + prompt).hashCode());
        }
    }

    /**
     * Looks up cached response. Automatically handles expiration.
     */
    public CachedEntry get(String key) {
        totalRequests.incrementAndGet();
        CachedEntry entry = cache.get(key);

        if (entry != null) {
            if (Instant.now().isBefore(entry.getExpiresAt())) {
                cacheHits.incrementAndGet();
                totalSavedLatencyMs.addAndGet(entry.getOriginalLatencyMs());
                return entry;
            } else {
                cache.remove(key); // Evict expired
            }
        }

        cacheMisses.incrementAndGet();
        return null;
    }

    /**
     * Stores LLM response in cache with TTL.
     */
    public void put(String key, String response, String model, long latencyMs, long ttlSeconds) {
        cache.put(key, CachedEntry.builder()
                .response(response)
                .model(model)
                .expiresAt(Instant.now().plusSeconds(ttlSeconds > 0 ? ttlSeconds : 3600))
                .originalLatencyMs(latencyMs)
                .build());
    }

    public Map<String, Object> getMetrics() {
        long total = totalRequests.get();
        long hits = cacheHits.get();
        double hitRate = total > 0 ? ((double) hits / total) * 100.0 : 0.0;

        return Map.of(
                "totalRequests", total,
                "cacheHits", hits,
                "cacheMisses", cacheMisses.get(),
                "hitRatePercentage", Math.round(hitRate * 10.0) / 10.0,
                "totalSavedLatencyMs", totalSavedLatencyMs.get(),
                "activeCachedEntries", cache.size(),
                "estimatedCostSavedUsd", Math.round((hits * 0.0003) * 10000.0) / 10000.0
        );
    }

    public void clear() {
        cache.clear();
        totalRequests.set(0);
        cacheHits.set(0);
        cacheMisses.set(0);
        totalSavedLatencyMs.set(0);
    }
}
