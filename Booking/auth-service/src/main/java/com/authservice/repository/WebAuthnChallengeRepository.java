package com.authservice.repository;

/**
 * Repository interface for managing ephemeral 32-byte WebAuthn cryptographic challenges stored exclusively in Redis.
 */
public interface WebAuthnChallengeRepository {

    void saveChallenge(String tenantId, String sessionId, String challengeBase64, long ttlSeconds);

    String getAndInvalidateChallenge(String tenantId, String sessionId);
}
