package com.payment.client;

import com.payment.client.impl.StripePaymentGatewayClient;
import com.payment.config.Resilience4jConfig;
import com.payment.dto.PaymentResponse;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = {
        StripeCircuitBreakerTest.TestConfig.class,
        StripePaymentGatewayClient.class,
        Resilience4jConfig.class
})
public class StripeCircuitBreakerTest {

    @Configuration
    @EnableAutoConfiguration
    static class TestConfig {}

    @Autowired
    private StripePaymentGatewayClient stripePaymentGatewayClient;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    private CircuitBreaker circuitBreaker;

    @BeforeEach
    void setUp() {
        stripePaymentGatewayClient.setSimulateFailure(false);
        circuitBreaker = circuitBreakerRegistry.circuitBreaker("stripePaymentService");
        circuitBreaker.reset();
    }

    @Test
    @DisplayName("Test 1: Stripe Gateway starts in CLOSED state and captures payments")
    void testClosedState() {
        assertEquals(CircuitBreaker.State.CLOSED, circuitBreaker.getState());

        PaymentResponse response = stripePaymentGatewayClient.processPayment("BOOK-101", 50.0);
        assertTrue(response.success());
        assertEquals("Payment Captured", response.statusMessage());
        assertEquals("STRIPE", response.providerName());
    }

    @Test
    @DisplayName("Test 2: Consecutive Stripe timeouts trip Circuit Breaker to OPEN state")
    void testTrippingToOpenStateAndFallback() {
        stripePaymentGatewayClient.setSimulateFailure(true);

        // Fail 5 consecutive calls
        for (int i = 0; i < 5; i++) {
            PaymentResponse response = stripePaymentGatewayClient.processPayment("BOOK-" + i, 50.0);
            assertFalse(response.success());
            assertEquals("TXN-FALLBACK-HELD", response.transactionId());
        }

        // Verify Circuit Breaker tripped to OPEN!
        assertEquals(CircuitBreaker.State.OPEN, circuitBreaker.getState());

        // Subsequent call fails fast instantly!
        PaymentResponse response = stripePaymentGatewayClient.processPayment("BOOK-FAIL-FAST", 50.0);
        assertFalse(response.success());
    }
}
