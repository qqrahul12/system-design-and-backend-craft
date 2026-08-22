package com.authservice.repository;

import com.authservice.domain.AuthSession;

import java.util.List;

/**
 * Repository interface for managing production AuthSessions stored in Redis.
 */
public interface AuthSessionRepository {

    AuthSession findBySessionId(String tenantId, String sessionId);

    void saveSession(AuthSession session, long ttlSeconds);

    void deleteSession(String tenantId, String sessionId);

    int countActiveSessions(String tenantId, String userId);

    List<AuthSession> findActiveSessions(String tenantId, String userId);
}
