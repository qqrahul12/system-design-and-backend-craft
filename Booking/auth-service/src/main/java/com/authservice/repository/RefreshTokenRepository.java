package com.authservice.repository;

import com.authservice.domain.RefreshToken;

/**
 * Repository interface for managing Refresh Tokens, token rotation, and replay attack family revocations.
 */
public interface RefreshTokenRepository {

    RefreshToken findByTokenHash(String tenantId, String tokenHash);

    void save(RefreshToken refreshToken);

    /**
     * Revokes all tokens belonging to a rotation family (triggered on replay attack detection!).
     */
    void revokeTokenFamily(String tenantId, String tokenFamilyId);

    /**
     * Revokes all refresh tokens for a user across all devices (triggered on global logout!).
     */
    void revokeAllUserTokens(String tenantId, String userId);
}
