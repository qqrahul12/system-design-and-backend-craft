package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.engine.hook.PostAuthHook;
import com.authservice.repository.AuditLogRepository;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Post-Auth Hook writing security audit logs to AuditLogRepository.
 */
@Component
public class AuditLogHook implements PostAuthHook {

    private final AuditLogRepository auditLogRepository;

    public AuditLogHook(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public String getHookName() {
        return "AUDIT_LOG";
    }

    @Override
    public int getOrder() {
        return 2;
    }

    @Override
    public Map<String, Object> execute(AuthContext context, Map<String, Object> existingClaimsMap) {
        if (context != null) {
            auditLogRepository.logEvent(
                    context.getTenantId(),
                    context.getUserId(),
                    "AUTH_SUCCESS",
                    context.getClientIp(),
                    Map.of("user_agent", context.getUserAgent() != null ? context.getUserAgent() : "unknown")
            );
        }
        return existingClaimsMap;
    }
}
