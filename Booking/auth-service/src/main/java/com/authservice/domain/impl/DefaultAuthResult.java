package com.authservice.domain.impl;

import com.authservice.domain.AuthResult;

/**
 * Java 21 Record implementation of AuthResult interface.
 */
public record DefaultAuthResult(
        String status,
        String sessionId,
        String userId,
        String accessToken,
        String refreshToken,
        String nextRequiredStepId,
        String errorMessage
) implements AuthResult {

    @Override
    public String getStatus() {
        return status;
    }

    @Override
    public String getSessionId() {
        return sessionId;
    }

    @Override
    public String getUserId() {
        return userId;
    }

    @Override
    public String getAccessToken() {
        return accessToken;
    }

    @Override
    public String getRefreshToken() {
        return refreshToken;
    }

    @Override
    public String getNextRequiredStepId() {
        return nextRequiredStepId;
    }

    @Override
    public String getErrorMessage() {
        return errorMessage;
    }
}
