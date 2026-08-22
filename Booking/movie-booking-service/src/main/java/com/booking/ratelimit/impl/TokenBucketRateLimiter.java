package com.booking.ratelimit.impl;

import com.booking.ratelimit.RateLimitResult;
import com.booking.ratelimit.RateLimiter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class TokenBucketRateLimiter implements RateLimiter {

    private final double capacity;
    private final double refilRatePerSecond;
    private final Map<String, TokenBucket> tokenBuckets = new ConcurrentHashMap<>();

    public TokenBucketRateLimiter(double capacity, double refilRatePerSecond) {
        this.capacity = capacity;
        this.refilRatePerSecond = refilRatePerSecond;
    }
    /**
     * @param clientIp
     * @return
     */
    @Override
    public RateLimitResult tryAcquire(String clientIp) {
        TokenBucket bucket = tokenBuckets.computeIfAbsent(clientIp, ip -> new TokenBucket(capacity, refilRatePerSecond));
        return bucket.tryConsume();
    }
}
