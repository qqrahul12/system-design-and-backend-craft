package com.authservice.domain;

/**
 * Interface representing the output of an authentication step execution.
 */
public interface AuthResult {

    /**
     * Auth Status: "SUCCESS", "CHALLENGE_REQUIRED", "FORCE_CHANGE_PASSWORD", "FAILED", "BLOCKED".
     */
    String getStatus();

    String getSessionId();

    String getUserId();

    String getAccessToken();

    String getRefreshToken();

    String getNextRequiredStepId();

    String getErrorMessage();

    default boolean isComplete() {
        return "SUCCESS".equalsIgnoreCase(getStatus());
    }
}
