package com.authservice.domain.impl;

import com.authservice.domain.UserCredential;

/**
 * Java 21 Record implementation of UserCredential interface.
 */
public record DefaultUserCredential(
        String credentialId,
        String userId,
        String tenantId,
        String credentialType,
        String passwordHash
) implements UserCredential {

    @Override
    public String getCredentialId() {
        return credentialId;
    }

    @Override
    public String getUserId() {
        return userId;
    }

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public String getCredentialType() {
        return credentialType;
    }

    @Override
    public String getPasswordHash() {
        return passwordHash;
    }
}
