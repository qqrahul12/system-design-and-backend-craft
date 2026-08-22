package com.promoservice.domain.impl;

import com.promoservice.domain.Actor;
import java.util.Map;

/**
 * Java 21 Record implementation of the Actor interface.
 */
public record DefaultActor(
        String actorId,
        String actorType,
        Map<String, Object> attributes
) implements Actor {

    @Override
    public String getActorId() {
        return actorId;
    }

    @Override
    public String getActorType() {
        return actorType;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes != null ? attributes : Map.of();
    }

    @Override
    public Object getAttribute(String key) {
        return getAttributes().get(key);
    }
}
