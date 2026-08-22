package com.promoservice.domain.impl;

import com.promoservice.domain.ConditionNode;
import java.util.List;

/**
 * Java 21 Record implementation of ConditionNode AST interface.
 */
public record DefaultConditionNode(
        String operator,
        String field,
        Object value,
        List<ConditionNode> children
) implements ConditionNode {

    @Override
    public String getOperator() {
        return operator;
    }

    @Override
    public String getField() {
        return field;
    }

    @Override
    public Object getValue() {
        return value;
    }

    @Override
    public List<ConditionNode> getChildren() {
        return children != null ? children : List.of();
    }
}
