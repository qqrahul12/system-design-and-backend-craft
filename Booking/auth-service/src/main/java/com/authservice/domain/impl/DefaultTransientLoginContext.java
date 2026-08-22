package com.authservice.domain.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.authservice.domain.TransientLoginContext;

import java.util.List;
import java.util.Map;

/**
 * Java 21 Record implementation of TransientLoginContext interface.
 */
public record DefaultTransientLoginContext(
        @JsonProperty("tenantId") String tenantId,
        @JsonProperty("userId") String userId,
        @JsonProperty("deviceId") String deviceId,
        @JsonProperty("clientIp") String clientIp,
        @JsonProperty("completedStepIds") List<String> completedStepIds,
        @JsonProperty("verifiedFactors") List<String> verifiedFactors,
        @JsonProperty("challengeState") Map<String, Object> challengeState,
        @JsonProperty("createdAtTimestamp") long createdAtTimestamp,
        @JsonProperty("expiresAtTimestamp") long expiresAtTimestamp
) implements TransientLoginContext {

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public String getUserId() {
        return userId;
    }

    @Override
    public String getDeviceId() {
        return deviceId;
    }

    @Override
    public String getClientIp() {
        return clientIp;
    }

    @Override
    public List<String> getCompletedStepIds() {
        return completedStepIds != null ? completedStepIds : List.of();
    }

    @Override
    public List<String> getVerifiedFactors() {
        return verifiedFactors != null ? verifiedFactors : List.of();
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
