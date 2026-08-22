package com.authservice.domain;

/**
 * Interface representing tenant-level security configurations and policies.
 */
public interface TenantSecurityPolicy {

    String getTenantId();

    boolean isMfaRequired();

    boolean isBiometricsAllowed();

    PasswordPolicy getPasswordPolicy();

    long getAccessTokenTtlSeconds();

    long getRefreshTokenTtlSeconds();

    int getMaxFailedAttempts();
}
