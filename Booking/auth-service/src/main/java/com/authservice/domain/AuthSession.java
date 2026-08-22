package com.authservice.domain;

import java.util.List;
import java.util.Map;

/**
 * Interface representing a rich, production-grade authentication session state stored in Redis.
 */
public interface AuthSession {

    String getSessionId();

    String getTenantId();

    String getUserId();

    /**
     * Session lifecycle status: "INITIALIZED", "IN_PROGRESS", "CHALLENGE_REQUIRED", "FORCE_CHANGE_PASSWORD", "COMPLETED", "EXPIRED".
     */
    String getSessionStatus();

    String getCurrentStepId();

    int getCurrentStepIndex();

    /**
     * List of verified authentication factors so far (e.g. ["PASSWORD"], ["PASSWORD", "TOTP_MFA"]).
     */
    List<String> getVerifiedFactors();

    /**
     * Risk engine context evaluated by Pre-Auth hooks (e.g. riskScore=65, isNewDevice=true).
     */
    Map<String, Object> getRiskContext();

    /**
     * Device & Network metadata (clientIp, userAgent, deviceId, geoCountry).
     */
    Map<String, Object> getDeviceMetadata();

    /**
     * Ephemeral Challenge State (active OTP hash, WebAuthn challenge, TTL).
     */
    Map<String, Object> getChallengeState();

    long getCreatedAtTimestamp();

    long getExpiresAtTimestamp();
}
