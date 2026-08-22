package com.authservice.domain;

/**
 * Interface representing the result of an authentication step or flow execution.
 */
public interface AuthFlowResult {

    /**
     * Flow Status: "SUCCESS", "CHALLENGE_REQUIRED", "FAILED", "BLOCKED".
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
