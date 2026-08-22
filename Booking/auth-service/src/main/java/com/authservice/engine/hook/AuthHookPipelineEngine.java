package com.authservice.engine.hook;

import com.authservice.domain.AuthContext;

import java.util.Map;

/**
 * Interface for the Pre-Auth and Post-Auth Hook Pipeline Engine.
 * Filters and executes only tenant-enabled hooks driven by TenantFlowConfig.
 */
public interface AuthHookPipelineEngine {

    /**
     * Executes configured Pre-Authentication Hooks for the tenant context.
     */
    PreAuthHook.PreAuthResult executePreAuthPipeline(AuthContext context, Map<String, Object> payload);

    /**
     * Executes configured Post-Authentication Hooks for the tenant context.
     */
    Map<String, Object> executePostAuthPipeline(AuthContext context, Map<String, Object> initialClaims);
}
