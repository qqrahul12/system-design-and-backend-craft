package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Strategy implementation for GREATER_THAN operator.
 * Compares numeric fields (e.g. cart.subtotal_cents, cart.shipping_cents).
 */
@Component
public class GtConditionEvaluator implements ConditionEvaluator {

    @Override
    public String getOperator() {
        return "GREATER_THAN";
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

        try {
            BigDecimal actual = new BigDecimal(actualValue.toString());
            BigDecimal expected = new BigDecimal(condition.getValue().toString());
            return actual.compareTo(expected) > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private Object extractFieldValue(String field, CartContext cart, Actor actor) {
        if (field.startsWith("cart.")) {
            String prop = field.substring(5);
            return switch (prop) {
                case "subtotal_cents" -> cart.getSubtotalCents();
                case "shipping_cents" -> cart.getShippingCents();
                default -> cart.getMetadataAttribute(prop);
            };
        } else if (field.startsWith("actor.")) {
            String prop = field.substring(6);
            return actor.getAttribute(prop);
        }
        return null;
    }
}
