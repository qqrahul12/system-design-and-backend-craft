package com.authservice.domain.impl;

import com.authservice.domain.AuthContext;
import java.util.Map;

/**
 * Java 21 Record implementation of AuthContext interface.
 */
public record DefaultAuthContext(
        String sessionId,
        String tenantId,
        String userId,
        String clientIp,
        String userAgent,
        String currentStepId,
        Map<String, Object> metadata
) implements AuthContext {

    @Override
    public String getSessionId() {
        return sessionId;
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
    public String getClientIp() {
        return clientIp;
    }

    @Override
    public String getUserAgent() {
        return userAgent;
    }

    @Override
    public String getCurrentStepId() {
        return currentStepId;
    }

    @Override
    public Map<String, Object> getMetadata() {
        return metadata != null ? metadata : Map.of();
    }

    @Override
    public Object getMetadataAttribute(String key) {
        return getMetadata().get(key);
    }
}
