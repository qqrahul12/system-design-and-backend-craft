package com.authservice.domain.impl;

import com.authservice.domain.PasswordPolicy;
import com.authservice.domain.TenantSecurityPolicy;

/**
 * Java 21 Record implementation of TenantSecurityPolicy interface.
 */
public record DefaultTenantSecurityPolicy(
        String tenantId,
        boolean mfaRequired,
        boolean biometricsAllowed,
        PasswordPolicy passwordPolicy,
        long accessTokenTtlSeconds,
        long refreshTokenTtlSeconds,
        int maxFailedAttempts
) implements TenantSecurityPolicy {

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public boolean isMfaRequired() {
        return mfaRequired;
    }

    @Override
    public boolean isBiometricsAllowed() {
        return biometricsAllowed;
    }

    @Override
    public PasswordPolicy getPasswordPolicy() {
        return passwordPolicy;
    }

    @Override
    public long getAccessTokenTtlSeconds() {
        return accessTokenTtlSeconds;
    }

    @Override
    public long getRefreshTokenTtlSeconds() {
        return refreshTokenTtlSeconds;
    }

    @Override
    public int getMaxFailedAttempts() {
        return maxFailedAttempts;
    }
}
