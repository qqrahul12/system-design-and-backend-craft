package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.engine.hook.PostAuthHook;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Post-Auth Hook enriching outgoing JWT tokens with tenant-specific custom claims
 * (e.g. tenant_domain, org_roles, permissions).
 */
@Component
public class JWTClaimEnricherHook implements PostAuthHook {

    @Override
    public String getHookName() {
        return "JWT_CLAIM_ENRICHER";
    }

    @Override
    public int getOrder() {
        return 1;
    }

    @Override
    public Map<String, Object> execute(AuthContext context, Map<String, Object> existingClaimsMap) {
        Map<String, Object> enrichedClaims = new HashMap<>(existingClaimsMap != null ? existingClaimsMap : Map.of());

        if (context != null) {
            enrichedClaims.put("tenant_id", context.getTenantId());
            enrichedClaims.put("user_id", context.getUserId());
            enrichedClaims.put("roles", List.of("ROLE_USER"));
            enrichedClaims.put("iss", "https://auth." + context.getTenantId() + ".enterprise.com");
        }

        return enrichedClaims;
    }
}
