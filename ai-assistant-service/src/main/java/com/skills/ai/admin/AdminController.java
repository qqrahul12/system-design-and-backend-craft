package com.skills.ai.admin;

import com.skills.ai.patterns.adapter.ResilientCardPaymentAdapter;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
    @Autowired(required = false)
    private ResilientCardPaymentAdapter cardPaymentAdapter;
    @Autowired(required = false)
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(adminAnalyticsService.getDashboardAnalytics());
    }

    @PostMapping("/briefing")
    public ResponseEntity<Map<String, Object>> generateBriefing() {
        return ResponseEntity.ok(adminAnalyticsService.getStructuredExecutiveBriefing());
    }

    @PostMapping("/circuit-breaker/toggle-stripe-failure")
    public ResponseEntity<Map<String, Object>> toggleStripeFailure(@RequestBody(required = false) Map<String, Object> req) {
        boolean simulate;
        if (req != null && req.containsKey("simulateFailure")) {
            simulate = Boolean.TRUE.equals(req.get("simulateFailure"));
        } else {
            simulate = cardPaymentAdapter == null || !cardPaymentAdapter.isSimulateFailure();
        }
        if (cardPaymentAdapter != null) {
            cardPaymentAdapter.setSimulateFailure(simulate);
        }
        return ResponseEntity.ok(Map.of(
                "simulateFailure", simulate,
                "status", simulate ? "SIMULATING_STRIPE_FAILURE_FOR_CIRCUIT_BREAKER" : "STRIPE_GATEWAY_HEALTHY"
        ));
    }

    @GetMapping("/circuit-breaker/status")
    public ResponseEntity<Map<String, Object>> getCircuitBreakerStatus() {
        String state = "CLOSED";
        if (circuitBreakerRegistry != null) {
            var cb = circuitBreakerRegistry.find("stripePaymentService");
            if (cb.isPresent()) {
                state = cb.get().getState().name();
            }
        }
        boolean simulating = cardPaymentAdapter != null && cardPaymentAdapter.isSimulateFailure();
        return ResponseEntity.ok(Map.of(
                "circuitBreaker", "stripePaymentService",
                "state", state,
                "provider", "STRIPE (payment-service)",
                "simulateFailure", simulating
        ));
    }
}
