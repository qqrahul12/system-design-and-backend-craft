package com.booking.ratelimit;

import com.booking.ratelimit.impl.TokenBucketRateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class TokenBucketRateLimiterTest {

    @Test
    @DisplayName("Test Token Bucket Capacity and Refill Rate")
    void testTokenBucketCapacityAndRefill() throws InterruptedException {
        // Capacity = 10 tokens, Refill = 2 tokens/sec
        RateLimiter rateLimiter = new TokenBucketRateLimiter(10.0, 2.0);
        String clientIp = "192.168.1.1";

        // 1. Initial Burst: First 10 requests must succeed!
        for (int i = 0; i < 10; i++) {
            assertTrue(rateLimiter.tryAcquire(clientIp).allowed(), "Request " + (i + 1) + " should be allowed!");
        }

        // 2. 11th Request must be rejected (bucket empty)!
        assertFalse(rateLimiter.tryAcquire(clientIp).allowed(), "11th request should be rejected!");

        // 3. Wait 1 second (Refills ~2 tokens)
        Thread.sleep(1050);

        // 4. Next 2 requests must succeed!
        assertTrue(rateLimiter.tryAcquire(clientIp).allowed(), "Request after 1s refill should succeed!");
        assertTrue(rateLimiter.tryAcquire(clientIp).allowed(), "Second request after 1s refill should succeed!");
        assertFalse(rateLimiter.tryAcquire(clientIp).allowed(), "3rd request after 1s should be rejected!");
    }

    @Test
    @DisplayName("Test Per-Client IP Isolation")
    void testClientIpIsolation() {
        RateLimiter rateLimiter = new TokenBucketRateLimiter(2.0, 1.0);
        String clientA = "10.0.0.1";
        String clientB = "10.0.0.2";

        // Client A consumes its 2 tokens
        assertTrue(rateLimiter.tryAcquire(clientA).allowed());
        assertTrue(rateLimiter.tryAcquire(clientA).allowed());
        assertFalse(rateLimiter.tryAcquire(clientA).allowed(), "Client A should be rate limited!");

        // Client B should still have its full 2 tokens available!
        assertTrue(rateLimiter.tryAcquire(clientB).allowed(), "Client B should be allowed independently!");
        assertTrue(rateLimiter.tryAcquire(clientB).allowed(), "Client B should be allowed independently!");
        assertFalse(rateLimiter.tryAcquire(clientB).allowed(), "Client B should be rate limited now!");
    }
}
