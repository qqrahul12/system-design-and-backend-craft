package com.promoservice.engine.action.impl;

import com.promoservice.engine.action.ActionHandler;
import com.promoservice.engine.action.ActionHandlerRegistry;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring Component managing registry lookup for ActionHandler strategies.
 * Automatically injects all ActionHandler Spring beans.
 */
@Component
public class DefaultActionHandlerRegistry implements ActionHandlerRegistry {

    private final Map<String, ActionHandler> registry = new ConcurrentHashMap<>();

    public DefaultActionHandlerRegistry(List<ActionHandler> handlers) {
        for (ActionHandler handler : handlers) {
            register(handler);
        }
    }

    @Override
    public void register(ActionHandler handler) {
        if (handler != null && handler.getActionType() != null) {
            registry.put(handler.getActionType().toUpperCase(), handler);
        }
    }

    @Override
    public ActionHandler getHandler(String actionType) {
        if (actionType == null) return null;
        return registry.get(actionType.toUpperCase());
    }
}
