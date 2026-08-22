package com.authservice.domain;

import java.util.List;

/**
 * Interface representing a condition node in an Auth Flow Graph (e.g. EQUALS, GREATER_THAN).
 */
public interface ConditionNode {

    String getOperator();

    String getField();

    Object getValue();

    List<ConditionNode> getChildren();
}
