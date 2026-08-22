package com.promoservice.engine.action.impl;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.engine.action.ActionHandler;
import com.promoservice.engine.action.ActionHandlerRegistry;
import com.promoservice.engine.action.ActionPipelineEngine;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

/**
 * Pipeline / Chain of Responsibility Pattern implementation for executing promotion actions.
 * Sorts action definitions by executionOrder and applies them sequentially.
 */
@Service
public class DefaultActionPipelineEngine implements ActionPipelineEngine {

    private final ActionHandlerRegistry registry;

    public DefaultActionPipelineEngine(ActionHandlerRegistry registry) {
        this.registry = registry;
    }

    @Override
    public CartContext executePipeline(List<ActionDefinition> actions, CartContext cart, Actor actor) {
        if (actions == null || actions.isEmpty() || cart == null) {
            return cart;
        }

        // Sort actions by executionOrder ascending
        List<ActionDefinition> sortedActions = actions.stream()
                .sorted(Comparator.comparingInt(ActionDefinition::getExecutionOrder))
                .toList();

        CartContext currentCart = cart;

        for (ActionDefinition action : sortedActions) {
            if (action == null || action.getActionType() == null) {
                continue;
            }

            ActionHandler handler = registry.getHandler(action.getActionType());
            if (handler == null) {
                throw new IllegalArgumentException("Unsupported action type: " + action.getActionType());
            }

            currentCart = handler.apply(action, currentCart, actor);
        }

        return currentCart;
    }
}
