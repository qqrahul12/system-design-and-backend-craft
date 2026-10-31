package com.booking.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class PaymentGatewayClient {

    private final RestTemplate restTemplate;
    
    // We can toggle this to test local failures without needing the actual payment-service running
    private boolean simulateFailure = false;

    public PaymentGatewayClient() {
        this.restTemplate = new RestTemplate();
    }

    public void setSimulateFailure(boolean simulateFailure) {
        this.simulateFailure = simulateFailure;
    }

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public String processPayment(String bookingId, double amount) {
        if (simulateFailure) {
            log.error("Simulating internal network failure to payment-service...");
            throw new RuntimeException("Internal Network Timeout (504)");
        }
        
        log.info("Making actual HTTP call to payment-service for bookingId: {} with amount: ${}", bookingId, amount);
        
        // Real inter-service communication!
        // Assuming payment-service is running on port 8081
        String url = "http://localhost:8081/api/payments/charge?bookingId=" + bookingId + "&amount=" + amount;
        
        try {
            return restTemplate.postForObject(url, null, String.class);
        } catch (Exception e) {
            log.error("Failed to reach payment-service at {}: {}", url, e.getMessage());
            throw e; // Rethrow so Circuit Breaker can record the failure
        }
    }

    /**
     * Fallback method triggered by the Circuit Breaker
     */
    public String paymentFallback(String bookingId, double amount, Throwable ex) {
        log.warn("Circuit Breaker OPEN or network failed for bookingId: {}. Reason: {}", bookingId, ex.getMessage());
        return "FALLBACK_SUCCESS_PENDING:" + bookingId;
    }
}
