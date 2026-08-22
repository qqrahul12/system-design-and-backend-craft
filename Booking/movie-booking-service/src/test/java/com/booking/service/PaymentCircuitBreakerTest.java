package com.booking.service;

import com.booking.config.Resilience4jConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(classes = {
        PaymentCircuitBreakerTest.TestConfig.class,
        PaymentGatewayClient.class,
        Resilience4jConfig.class
})
public class PaymentCircuitBreakerTest {

    @Configuration
    @EnableAutoConfiguration
    static class TestConfig {}

    @Autowired
    private PaymentGatewayClient paymentGatewayClient;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    private CircuitBreaker circuitBreaker;

    @BeforeEach
    void setUp() {
        paymentGatewayClient.setSimulateFailure(false);
        circuitBreaker = circuitBreakerRegistry.circuitBreaker("paymentService");
        circuitBreaker.reset(); // Reset circuit state to CLOSED before each test
    }

    @Test
    @DisplayName("Test 1: Circuit Breaker starts in CLOSED state and passes requests")
    void testClosedState() {
        assertEquals(CircuitBreaker.State.CLOSED, circuitBreaker.getState());

        String response = paymentGatewayClient.processPayment("BOOK-101", 50.0);
        assertEquals("SUCCESS:BOOK-101", response);
        assertEquals(CircuitBreaker.State.CLOSED, circuitBreaker.getState());
    }

    @Test
    @DisplayName("Test 2: Repeated failures trip Circuit Breaker to OPEN state and trigger Fallback")
    void testTrippingToOpenStateAndFallback() {
        paymentGatewayClient.setSimulateFailure(true);

        // Fail 5 consecutive calls (Sliding window size = 5, Failure threshold = 50%)
        for (int i = 0; i < 5; i++) {
            String response = paymentGatewayClient.processPayment("BOOK-" + i, 50.0);
            assertTrue(response.startsWith("FALLBACK_TICKET_HELD"));
        }

        // Verify Circuit Breaker tripped to OPEN!
        assertEquals(CircuitBreaker.State.OPEN, circuitBreaker.getState());

        // Subsequent calls while OPEN fail fast instantly into Fallback!
        String response = paymentGatewayClient.processPayment("BOOK-FAIL-FAST", 50.0);
        assertEquals("FALLBACK_TICKET_HELD:BOOK-FAIL-FAST", response);
    }

    @Test
    @DisplayName("Test 3: Cooldown period transitions Circuit Breaker from OPEN to HALF_OPEN")
    void testTransitionToHalfOpenState() throws InterruptedException {
        paymentGatewayClient.setSimulateFailure(true);

        // Trip circuit OPEN
        for (int i = 0; i < 5; i++) {
            paymentGatewayClient.processPayment("BOOK-" + i, 50.0);
        }
        assertEquals(CircuitBreaker.State.OPEN, circuitBreaker.getState());

        // Wait 2.1 seconds (Configured waitDurationInOpenState = 2s)
        Thread.sleep(2100);

        // Downstream gateway recovers!
        paymentGatewayClient.setSimulateFailure(false);

        // Trial call in HALF_OPEN state
        String response = paymentGatewayClient.processPayment("BOOK-RECOVER", 50.0);
        assertEquals("SUCCESS:BOOK-RECOVER", response);
    }
}
