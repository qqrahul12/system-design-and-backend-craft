package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Strategy implementation for EQUALS operator.
 * Performs equality checks on cart metadata, actor attributes, or promo codes.
 */
@Component
public class EqConditionEvaluator implements ConditionEvaluator {

    @Override
    public String getOperator() {
        return "EQUALS";
    }

    @Override
    public boolean evaluate(ConditionNode condition, CartContext cart, Actor actor) {
        if (condition == null || condition.getField() == null) {
            return false;
        }

        Object actualValue = extractFieldValue(condition.getField(), cart, actor);
        Object expectedValue = condition.getValue();

        if (actualValue == null && expectedValue == null) {
            return true;
        }
        if (actualValue == null || expectedValue == null) {
            return false;
        }

        return Objects.equals(actualValue.toString().trim(), expectedValue.toString().trim());
    }

    private Object extractFieldValue(String field, CartContext cart, Actor actor) {
        if (field.startsWith("cart.")) {
            String prop = field.substring(5);
            return switch (prop) {
                case "subtotal_cents" -> cart.getSubtotalCents();
                case "currency" -> cart.getCurrency();
                case "tenant_id" -> cart.getTenantId();
                case "promo_code" -> cart.getMetadataAttribute("promo_code");
                default -> cart.getMetadataAttribute(prop);
            };
        } else if (field.startsWith("actor.")) {
            String prop = field.substring(6);
            return switch (prop) {
                case "id" -> actor.getActorId();
                case "type" -> actor.getActorType();
                default -> actor.getAttribute(prop);
            };
        }
        return null;
    }
}
