package com.promoservice.domain.impl;

import com.promoservice.domain.ActionDefinition;
import java.util.Map;

/**
 * Java 21 Record implementation of ActionDefinition interface.
 */
public record DefaultActionDefinition(
        String actionType,
        int executionOrder,
        Map<String, Object> config
) implements ActionDefinition {

    @Override
    public String getActionType() {
        return actionType;
    }

    @Override
    public int getExecutionOrder() {
        return executionOrder;
    }

    @Override
    public Map<String, Object> getConfig() {
        return config != null ? config : Map.of();
    }
}
