package com.authservice.domain.impl;

import com.authservice.domain.ConcurrentSessionPolicy;

/**
 * Java 21 Record implementation of ConcurrentSessionPolicy interface.
 */
public record DefaultConcurrentSessionPolicy(
        int maxConcurrentSessions,
        String actionOnExceeded
) implements ConcurrentSessionPolicy {

    @Override
    public int getMaxConcurrentSessions() {
        return maxConcurrentSessions;
    }

    @Override
    public String getActionOnExceeded() {
        return actionOnExceeded != null ? actionOnExceeded : "BLOCK_NEW_LOGIN";
    }
}
