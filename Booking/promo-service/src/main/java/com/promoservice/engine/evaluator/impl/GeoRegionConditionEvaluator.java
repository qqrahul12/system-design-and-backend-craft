package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import org.springframework.stereotype.Component;

import java.util.Collection;

/**
 * Strategy Evaluator for Geographic Commerce Region validation (Country, State, City, Zipcode/Pincode).
 * Supports city/state/country-wise marketing offers (e.g., "Free Delivery in Mumbai", "10% off in California").
 */
@Component
public class GeoRegionConditionEvaluator implements ConditionEvaluator {

    @Override
    public String getOperator() {
        return "IN_GEO_REGION";
    }

    @Override
    public boolean evaluate(ConditionNode condition, CartContext cart, Actor actor) {
        if (condition == null || condition.getField() == null || condition.getValue() == null) {
            return false;
        }

        String field = condition.getField().toLowerCase().trim();
        Object actualValue = extractLocationField(field, cart, actor);

        if (actualValue == null) {
            return false;
        }

        String actualStr = actualValue.toString().trim();
        Object targetValues = condition.getValue();

        if (targetValues instanceof Collection<?> list) {
            return list.stream().anyMatch(item -> item != null && item.toString().trim().equalsIgnoreCase(actualStr));
        }

        return actualStr.equalsIgnoreCase(targetValues.toString().trim());
    }

    private Object extractLocationField(String field, CartContext cart, Actor actor) {
        // e.g., "cart.city", "cart.state", "cart.country", "cart.pincode", "actor.city", "actor.state"
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
