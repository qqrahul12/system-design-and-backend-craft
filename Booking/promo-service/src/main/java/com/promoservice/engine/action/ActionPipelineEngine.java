package com.promoservice.engine.action;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;

import java.util.List;

/**
 * Interface for the Action Pipeline Engine executing multiple chained promotion actions.
 */
public interface ActionPipelineEngine {

    /**
     * Executes a chain of ActionDefinitions sequentially on a cart context.
     *
     * @param actions List of actions to execute.
     * @param cart    Initial cart context.
     * @param actor   Customer / B2B Account context.
     * @return Final transformed CartContext after all actions have executed.
     */
    CartContext executePipeline(List<ActionDefinition> actions, CartContext cart, Actor actor);
}
