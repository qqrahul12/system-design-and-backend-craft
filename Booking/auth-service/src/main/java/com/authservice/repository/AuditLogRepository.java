package com.authservice.repository;

import java.util.Map;

/**
 * Repository interface for logging security audit events.
 */
public interface AuditLogRepository {

    void logEvent(String tenantId, String userId, String eventType, String clientIp, Map<String, Object> metadata);
}
