package com.booking.config;

import com.booking.ratelimit.RateLimiter;
import com.booking.ratelimit.impl.TokenBucketRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimiterConfig {

    /**
     * Token Bucket Rate Limiter: Capacity of 10 requests, Refill rate of 2 tokens per second
     */
    @Bean
    public RateLimiter rateLimiter() {
        return new TokenBucketRateLimiter(10.0, 2.0);
    }
}
