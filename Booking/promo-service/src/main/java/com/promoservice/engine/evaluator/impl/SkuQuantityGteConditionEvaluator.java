package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.domain.LineItem;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for SKU_QUANTITY_GTE operator.
 * Crucial for B2B volume pricing (e.g. check if cart contains SKU 'PART-100' with quantity >= 500).
 */
@Component
public class SkuQuantityGteConditionEvaluator implements ConditionEvaluator {

    @Override
    public String getOperator() {
        return "SKU_QUANTITY_GTE";
    }

    @Override
    public boolean evaluate(ConditionNode condition, CartContext cart, Actor actor) {
        if (condition == null || condition.getValue() == null || cart == null || cart.getItems() == null) {
            return false;
        }

        // Expected SKU comes from condition.getField() or metadata
        String targetSku = condition.getField(); // e.g. "SKU-PART-100"
        int minQuantity = Integer.parseInt(condition.getValue().toString());

        int totalSkuQuantity = cart.getItems().stream()
                .filter(item -> item != null && targetSku.equalsIgnoreCase(item.getSku()))
                .mapToInt(LineItem::getQuantity)
                .sum();

        return totalSkuQuantity >= minQuantity;
    }
}
