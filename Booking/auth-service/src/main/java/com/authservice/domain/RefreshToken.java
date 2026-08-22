package com.authservice.domain;

/**
 * Interface representing an opaque Refresh Token record for session rotation & revocation.
 */
public interface RefreshToken {

    String getTokenId();

    String getTenantId();

    String getUserId();

    String getTokenFamilyId();

    String getTokenHash();

    /**
     * Token status: "ACTIVE", "ROTATED", "REVOKED".
     */
    String getStatus();

    String getDeviceId();

    long getCreatedAtTimestamp();

    long getExpiresAtTimestamp();

    default boolean isExpired() {
        return System.currentTimeMillis() > getExpiresAtTimestamp();
    }
}
