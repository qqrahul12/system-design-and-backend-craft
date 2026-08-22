package com.authservice.domain;

import java.util.Map;

/**
 * Interface representing the state of an ongoing or completed authentication request thread.
 */
public interface AuthContext {

    String getSessionId();

    String getTenantId();

    String getUserId();

    String getClientIp();

    String getUserAgent();

    String getCurrentStepId();

    Map<String, Object> getMetadata();

    Object getMetadataAttribute(String key);
}
