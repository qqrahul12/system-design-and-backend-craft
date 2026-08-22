package com.authservice.engine.hook;

import com.authservice.domain.AuthContext;
import java.util.Map;

/**
 * Strategy Interface for Post-Authentication Action Hooks.
 * Executed AFTER successful credential verification (e.g. JWT Claim Enrichment, Audit Logging, Webhooks).
 */
public interface PostAuthHook {

    String getHookName();

    int getOrder();

    /**
     * Executes post-auth action.
     *
     * @param context            Authentication thread context.
     * @param existingClaimsMap  Map of JWT claims being built.
     * @return Updated claims map or execution status.
     */
    Map<String, Object> execute(AuthContext context, Map<String, Object> existingClaimsMap);
}
