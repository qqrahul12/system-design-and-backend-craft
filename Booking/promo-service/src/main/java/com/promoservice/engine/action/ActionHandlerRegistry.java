package com.promoservice.engine.action;

/**
 * Registry / Factory Pattern Interface for managing and looking up ActionHandler strategies.
 */
public interface ActionHandlerRegistry {

    void register(ActionHandler handler);

    ActionHandler getHandler(String actionType);
}
