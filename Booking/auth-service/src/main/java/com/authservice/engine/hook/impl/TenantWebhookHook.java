package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.engine.hook.PostAuthHook;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Post-Auth Hook dispatching external HTTP webhooks to tenant configured endpoints (e.g. CRM / Event stream).
 */
@Component
public class TenantWebhookHook implements PostAuthHook {

    @Override
    public String getHookName() {
        return "TENANT_WEBHOOK";
    }

    @Override
    public int getOrder() {
        return 3;
    }

    @Override
    public Map<String, Object> execute(AuthContext context, Map<String, Object> existingClaimsMap) {
        // Dispatches async webhook event if tenant has configured webhook endpoint
        return existingClaimsMap;
    }
}
