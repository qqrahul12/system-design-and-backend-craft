package com.promoservice.engine.evaluator;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;

/**
 * Strategy Pattern Interface for AST Condition Evaluators.
 * Every operator (e.g., GREATER_THAN, EQUALS, SKU_QUANTITY_GTE) implements this interface.
 */
public interface ConditionEvaluator {

    /**
     * Unique operator identifier supported by this evaluator (e.g. "GREATER_THAN").
     */
    String getOperator();

    /**
     * Evaluates a single terminal condition node against the cart and actor context.
     *
     * @param condition The AST condition node containing field and value.
     * @param cart      The current cart context.
     * @param actor     The customer or B2B account context.
     * @return true if condition passes, false otherwise.
     */
    boolean evaluate(ConditionNode condition, CartContext cart, Actor actor);
}
