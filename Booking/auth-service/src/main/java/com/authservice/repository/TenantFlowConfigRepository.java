package com.authservice.repository;

import com.authservice.domain.TenantFlowConfig;

/**
 * Repository interface for retrieving tenant-specific flow and hook configurations.
 */
public interface TenantFlowConfigRepository {

    TenantFlowConfig findByTenantId(String tenantId);

    void save(TenantFlowConfig flowConfig);
}
