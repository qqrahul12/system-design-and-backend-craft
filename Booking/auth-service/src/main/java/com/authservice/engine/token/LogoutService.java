package com.authservice.engine.token;

/**
 * Interface for Logout Management (Single-Device Logout and Global All-Device Logout).
 */
public interface LogoutService {

    /**
     * Single-device logout: Revokes current refresh token and blacklists access token JTI.
     */
    boolean logoutSingleDevice(String tenantId, String rawRefreshToken, String accessTokenJti, long accessTtlSeconds);

    /**
     * Global logout: Revokes all refresh tokens and invalidates all active sessions for user.
     */
    boolean logoutAllDevices(String tenantId, String userId);
}
