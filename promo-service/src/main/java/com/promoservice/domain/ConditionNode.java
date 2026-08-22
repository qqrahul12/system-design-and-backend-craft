package com.promoservice.domain;

import java.util.List;

/**
 * Interface representing a node in the AST (Abstract Syntax Tree) Condition Tree.
 * Nodes can be logical aggregators (AND, OR, NOT) or terminal comparison expressions (EQUALS, GREATER_THAN, etc.).
 */
public interface ConditionNode {

    /**
     * Operator type:
     * Logical: "AND", "OR", "NOT"
     * Comparison: "EQUALS", "GREATER_THAN", "LESS_THAN", "IN", "SKU_QUANTITY_GTE", "CONTAINS"
     */
    String getOperator();

    /**
     * Target context field for comparison operators (e.g. "cart.subtotal_cents", "actor.user_tier").
     */
    String getField();

    /**
     * Expected value for comparison operators.
     */
    Object getValue();

    /**
     * Child condition nodes for logical aggregator operators (AND, OR, NOT).
     */
    List<ConditionNode> getChildren();

    /**
     * Returns true if this node is a composite logical node (AND, OR, NOT).
     */
    default boolean isLogical() {
        String op = getOperator();
        return "AND".equalsIgnoreCase(op) || "OR".equalsIgnoreCase(op) || "NOT".equalsIgnoreCase(op);
    }
}
