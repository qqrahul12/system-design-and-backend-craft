package com.promoservice.engine.evaluator;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;

/**
 * Core Abstract Syntax Tree (AST) Rule Engine interface for evaluating complex condition trees.
 */
public interface ASTRuleEngine {

    /**
     * Recursively evaluates an AST ConditionNode tree against the provided cart and actor context.
     *
     * @param root  Root AST node (can be logical aggregator or single comparison expression).
     * @param cart  Cart context.
     * @param actor B2C or B2B Actor context.
     * @return true if all rule conditions pass, false otherwise.
     */
    boolean evaluate(ConditionNode root, CartContext cart, Actor actor);
}
