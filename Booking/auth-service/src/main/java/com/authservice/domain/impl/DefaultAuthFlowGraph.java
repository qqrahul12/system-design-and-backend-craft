package com.authservice.domain.impl;

import com.authservice.domain.AuthFlowGraph;
import com.authservice.domain.FlowStep;

import java.util.List;

/**
 * Java 21 Record implementation of AuthFlowGraph interface.
 */
public record DefaultAuthFlowGraph(
        String flowId,
        String tenantId,
        List<FlowStep> steps
) implements AuthFlowGraph {

    @Override
    public String getFlowId() {
        return flowId;
    }

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public List<FlowStep> getSteps() {
        return steps != null ? steps : List.of();
    }
}
