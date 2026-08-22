package com.authservice.domain;

/**
 * Interface / Record representing an issued Access Token and Refresh Token pair.
 */
public record TokenPair(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds
) {
    public static TokenPair of(String accessToken, String refreshToken, long expiresInSeconds) {
        return new TokenPair(accessToken, refreshToken, "Bearer", expiresInSeconds);
    }
}
