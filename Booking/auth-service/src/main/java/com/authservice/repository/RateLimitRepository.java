package com.authservice.repository;

/**
 * Repository interface for checking and recording rate limits per tenant and IP.
 */
public interface RateLimitRepository {

    boolean isRateLimited(String tenantId, String clientIp, int maxAllowedAttempts);

    void recordFailedAttempt(String tenantId, String clientIp);
}
