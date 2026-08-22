package com.authservice.repository.impl;

import com.authservice.domain.TenantFlowConfig;
import com.authservice.domain.impl.DefaultTenantFlowConfig;
import com.authservice.repository.TenantFlowConfigRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Repository implementation for managing tenant flow and hook configurations.
 */
@Repository
public class InMemoryTenantFlowConfigRepository implements TenantFlowConfigRepository {

    private final Map<String, TenantFlowConfig> configStore = new ConcurrentHashMap<>();

    public InMemoryTenantFlowConfigRepository() {
        // Sample tenant configurations
        save(new DefaultTenantFlowConfig(
                "tenant_acme",
                List.of("BOT_DETECTION", "GEO_IP_BLOCK", "RATE_LIMIT"),
                List.of("JWT_CLAIM_ENRICHER", "AUDIT_LOG"),
                Map.of()
        ));

        save(new DefaultTenantFlowConfig(
                "tenant_b2c_basic",
                List.of("RATE_LIMIT"),
                List.of("JWT_CLAIM_ENRICHER"),
                Map.of()
        ));
    }

    @Override
    public TenantFlowConfig findByTenantId(String tenantId) {
        if (tenantId == null) return null;
        TenantFlowConfig config = configStore.get(tenantId);
        if (config == null) {
            // Default fallback config if tenant not found
            return new DefaultTenantFlowConfig(tenantId, List.of("RATE_LIMIT"), List.of("JWT_CLAIM_ENRICHER"), Map.of());
        }
        return config;
    }

    @Override
    public void save(TenantFlowConfig flowConfig) {
        if (flowConfig != null && flowConfig.getTenantId() != null) {
            configStore.put(flowConfig.getTenantId(), flowConfig);
        }
    }
}
