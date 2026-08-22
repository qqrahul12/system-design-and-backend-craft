package com.authservice.domain;

/**
 * Interface representing tenant-level concurrent session control policy.
 */
public interface ConcurrentSessionPolicy {

    int getMaxConcurrentSessions();

    /**
     * Action mode when limit exceeded: "BLOCK_NEW_LOGIN", "TERMINATE_OLDEST_SESSION", "REQUIRE_OTP_CHALLENGE".
     */
    String getActionOnExceeded();
}
