package com.authservice.domain;

import java.util.List;
import java.util.Map;

/**
 * Interface representing the tamper-proof transient login context payload
 * encrypted with AES-256-GCM (JWE) passed between client and server during multi-step authentication.
 * Ensures persistent user sessions are created ONLY after 100% successful flow completion.
 */
public interface TransientLoginContext {

    String getTenantId();

    String getUserId();

    String getDeviceId();

    String getClientIp();

    List<String> getCompletedStepIds();

    List<String> getVerifiedFactors();

    Map<String, Object> getChallengeState();

    long getCreatedAtTimestamp();

    long getExpiresAtTimestamp();

    default boolean isExpired() {
        return System.currentTimeMillis() > getExpiresAtTimestamp();
    }
}
