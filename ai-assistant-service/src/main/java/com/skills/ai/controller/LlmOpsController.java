package com.skills.ai.controller;

import com.skills.ai.llmops.LlmOpsCacheManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller exposing LLMOps Telemetry, Cost Savings, and Cache Metrics.
 */
@RestController
@RequestMapping("/api/v1/llmops")
@RequiredArgsConstructor
public class LlmOpsController {

    private final LlmOpsCacheManager cacheManager = LlmOpsCacheManager.getInstance();

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        return ResponseEntity.ok(cacheManager.getMetrics());
    }

    @PostMapping("/cache/clear")
    public ResponseEntity<Map<String, String>> clearCache() {
        cacheManager.clear();
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "LLMOps response cache cleared successfully"));
    }
}
