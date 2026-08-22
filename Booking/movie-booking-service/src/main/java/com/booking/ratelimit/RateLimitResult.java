package com.booking.ratelimit;

public record RateLimitResult(boolean allowed, double limit, double remainingTokens, double expirySeconds) {}
