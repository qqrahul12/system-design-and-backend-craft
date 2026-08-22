package com.authservice.repository;

/**
 * Repository interface for managing ephemeral 6-digit OTP challenge hashes stored exclusively in Redis (5-minute TTL).
 */
public interface OtpChallengeRepository {

    void saveOtpChallenge(String tenantId, String sessionId, String otpHash, long ttlSeconds);

    boolean verifyAndInvalidateOtp(String tenantId, String sessionId, String submittedOtp);
}
