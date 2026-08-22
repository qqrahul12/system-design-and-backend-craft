package com.authservice.domain.impl;

import com.authservice.domain.ConditionNode;
import com.authservice.domain.FlowStep;

import java.util.List;

/**
 * Java 21 Record implementation of FlowStep interface.
 */
public record DefaultFlowStep(
        String stepId,
        String stepType,
        List<String> allowedMethods,
        ConditionNode condition
) implements FlowStep {

    @Override
    public String getStepId() {
        return stepId;
    }

    @Override
    public String getStepType() {
        return stepType;
    }

    @Override
    public List<String> getAllowedMethods() {
        return allowedMethods != null ? allowedMethods : List.of();
    }

    @Override
    public ConditionNode getCondition() {
        return condition;
    }
}
