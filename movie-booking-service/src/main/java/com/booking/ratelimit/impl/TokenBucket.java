package com.booking.ratelimit.impl;

import com.booking.ratelimit.RateLimitResult;

import java.util.concurrent.locks.ReentrantLock;

public class TokenBucket {
    private final double capacity;
    private final double refilRatePerNano;
    private double tokens;
    private long lastRefilTime;
    private final ReentrantLock lock = new ReentrantLock();

    public TokenBucket(double capacity, double refilRatePerSecond) {
        this.capacity = capacity;
        this.refilRatePerNano = refilRatePerSecond / 1_000_000_000.0;
        this.tokens = capacity;
        this.lastRefilTime = System.nanoTime();
    }

    public RateLimitResult tryConsume() {
        lock.lock();
        try {
            long now = System.nanoTime();
            long diff = now - lastRefilTime;
            double tokensToAdd = diff * refilRatePerNano;
            tokens = Math.min(capacity, tokensToAdd + tokens);
            lastRefilTime = now;
            if (tokens >= 1.0) {
                tokens -= 1;
                return new RateLimitResult(true, capacity, tokens, 1);
            }
            return new RateLimitResult(false, capacity, 0, 1);
        } finally {
            lock.unlock();
        }
    }
}
