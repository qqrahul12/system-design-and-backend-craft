package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * Strategy implementation for IN operator.
 * Checks if a field value matches any element in a list/collection (e.g. user_tier IN ["VIP", "PLATINUM"]).
 */
@Component
public class InConditionEvaluator implements ConditionEvaluator {

    @Override
    public String getOperator() {
        return "IN";
    }

    @Override
    public boolean evaluate(ConditionNode condition, CartContext cart, Actor actor) {
        if (condition == null || condition.getField() == null || condition.getValue() == null) {
            return false;
        }

        Object actualValue = extractFieldValue(condition.getField(), cart, actor);
        if (actualValue == null) {
            return false;
        }

        Object expected = condition.getValue();
        if (expected instanceof Collection<?> collection) {
            String actualStr = actualValue.toString().trim();
            return collection.stream().anyMatch(item -> item != null && item.toString().trim().equalsIgnoreCase(actualStr));
        }

        return false;
    }

    private Object extractFieldValue(String field, CartContext cart, Actor actor) {
        if (field.startsWith("cart.")) {
            String prop = field.substring(5);
            return cart.getMetadataAttribute(prop);
        } else if (field.startsWith("actor.")) {
            String prop = field.substring(6);
            return actor.getAttribute(prop);
        }
        return null;
    }
}
