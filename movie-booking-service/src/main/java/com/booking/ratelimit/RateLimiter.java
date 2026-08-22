package com.booking.ratelimit;

public interface RateLimiter {
    RateLimitResult tryAcquire(String clientIp);
}
