package com.authservice.domain.impl;

import com.authservice.domain.RefreshToken;

/**
 * Java 21 Record implementation of RefreshToken interface.
 */
public record DefaultRefreshToken(
        String tokenId,
        String tenantId,
        String userId,
        String tokenFamilyId,
        String tokenHash,
        String status,
        String deviceId,
        long createdAtTimestamp,
        long expiresAtTimestamp
) implements RefreshToken {

    @Override
    public String getTokenId() {
        return tokenId;
    }

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public String getUserId() {
        return userId;
    }

    @Override
    public String getTokenFamilyId() {
        return tokenFamilyId;
    }

    @Override
    public String getTokenHash() {
        return tokenHash;
    }

    @Override
    public String getStatus() {
        return status;
    }

    @Override
    public String getDeviceId() {
        return deviceId;
    }

    @Override
    public long getCreatedAtTimestamp() {
        return createdAtTimestamp;
    }

    @Override
    public long getExpiresAtTimestamp() {
        return expiresAtTimestamp;
    }
}
