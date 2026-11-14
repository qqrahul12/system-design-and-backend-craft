package com.skills.ai.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller exposing cinema analytics, market trends, and predictive AI recommendations.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminAnalyticsService adminAnalyticsService;

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(adminAnalyticsService.getDashboardAnalytics());
    }

    @PostMapping("/briefing")
    public ResponseEntity<Map<String, Object>> generateBriefing() {
        return ResponseEntity.ok(adminAnalyticsService.getStructuredExecutiveBriefing());
    }
}
