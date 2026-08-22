package com.authservice.domain.impl;

import com.authservice.domain.AuthSession;

import java.util.List;
import java.util.Map;

/**
 * Java 21 Record implementation of AuthSession interface.
 */
public record DefaultAuthSession(
        String sessionId,
        String tenantId,
        String userId,
        String sessionStatus,
        String currentStepId,
        int currentStepIndex,
        List<String> verifiedFactors,
        Map<String, Object> riskContext,
        Map<String, Object> deviceMetadata,
        Map<String, Object> challengeState,
        long createdAtTimestamp,
        long expiresAtTimestamp
) implements AuthSession {

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
    public String getSessionStatus() {
        return sessionStatus;
    }

    @Override
    public String getCurrentStepId() {
        return currentStepId;
    }

    @Override
    public int getCurrentStepIndex() {
        return currentStepIndex;
    }

    @Override
    public List<String> getVerifiedFactors() {
        return verifiedFactors != null ? verifiedFactors : List.of();
    }

    @Override
    public Map<String, Object> getRiskContext() {
        return riskContext != null ? riskContext : Map.of();
    }

    @Override
    public Map<String, Object> getDeviceMetadata() {
        return deviceMetadata != null ? deviceMetadata : Map.of();
    }

    @Override
    public Map<String, Object> getChallengeState() {
        return challengeState != null ? challengeState : Map.of();
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
