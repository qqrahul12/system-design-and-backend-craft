package com.authservice.repository;

import com.authservice.domain.AuthFlowGraph;

/**
 * Repository interface for retrieving tenant authentication flow graphs.
 */
public interface AuthFlowGraphRepository {

    AuthFlowGraph findByTenantId(String tenantId);

    void save(AuthFlowGraph flowGraph);
}
