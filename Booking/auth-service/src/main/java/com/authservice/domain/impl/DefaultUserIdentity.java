package com.authservice.domain.impl;

import com.authservice.domain.UserIdentity;
import java.util.Map;

/**
 * Java 21 Record implementation of UserIdentity interface.
 */
public record DefaultUserIdentity(
        String identityId,
        String userId,
        String tenantId,
        String providerType,
        String externalSubjectId,
        String email,
        Map<String, Object> attributes
) implements UserIdentity {

    @Override
    public String getIdentityId() {
        return identityId;
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
    public String getProviderType() {
        return providerType;
    }

    @Override
    public String getExternalSubjectId() {
        return externalSubjectId;
    }

    @Override
    public String getEmail() {
        return email;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes != null ? attributes : Map.of();
    }
}
