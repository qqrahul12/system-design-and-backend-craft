package com.authservice.domain;

import java.util.List;

/**
 * Interface representing the complete authentication flow graph / state machine for a tenant.
 */
public interface AuthFlowGraph {

    String getFlowId();

    String getTenantId();

    List<FlowStep> getSteps();
}
