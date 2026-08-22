package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.engine.evaluator.ASTRuleEngine;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import com.promoservice.engine.evaluator.ConditionEvaluatorRegistry;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Composite Pattern implementation of the AST Rule Engine.
 * Recursively evaluates nested AND, OR, NOT logical nodes and dispatches terminal expressions to Strategy Evaluators.
 */
@Service
public class DefaultASTRuleEngine implements ASTRuleEngine {

    private final ConditionEvaluatorRegistry registry;

    public DefaultASTRuleEngine(ConditionEvaluatorRegistry registry) {
        this.registry = registry;
    }

    @Override
    public boolean evaluate(ConditionNode root, CartContext cart, Actor actor) {
        if (root == null) {
            return true; // Empty rule passes by default
        }

        String operator = root.getOperator();
        if (operator == null) {
            return false;
        }

        String opUpper = operator.toUpperCase();

        // 1. Composite Logical Aggregators (AND, OR, NOT)
        if (root.isLogical()) {
            List<ConditionNode> children = root.getChildren();
            return switch (opUpper) {
                case "AND" -> {
                    if (children == null || children.isEmpty()) yield true;
                    for (ConditionNode child : children) {
                        if (!evaluate(child, cart, actor)) yield false; // Short-circuit AND
                    }
                    yield true;
                }
                case "OR" -> {
                    if (children == null || children.isEmpty()) yield true;
                    for (ConditionNode child : children) {
                        if (evaluate(child, cart, actor)) yield true; // Short-circuit OR
                    }
                    yield false;
                }
                case "NOT" -> {
                    if (children == null || children.isEmpty()) yield true;
                    yield !evaluate(children.get(0), cart, actor);
                }
                default -> false;
            };
        }

        // 2. Terminal Comparison Operators (Dispatched via Strategy Registry)
        ConditionEvaluator evaluator = registry.getEvaluator(opUpper);
        if (evaluator == null) {
            throw new IllegalArgumentException("Unsupported condition operator: " + operator);
        }

        return evaluator.evaluate(root, cart, actor);
    }
}
