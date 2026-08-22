package com.authservice.repository;

/**
 * Repository interface for managing JWT Access Token blacklisting and global revocation timestamps.
 */
public interface JwtBlacklistRepository {

    /**
     * Adds an Access Token JTI (JWT ID) to the blacklist until its expiration.
     */
    void blacklistJti(String tenantId, String jti, long expiresAtTimestamp);

    boolean isJtiBlacklisted(String tenantId, String jti);

    /**
     * Updates user_token_valid_after_timestamp for global logout.
     */
    void updateUserTokenValidAfterTimestamp(String tenantId, String userId, long timestamp);

    long getUserTokenValidAfterTimestamp(String tenantId, String userId);
}
