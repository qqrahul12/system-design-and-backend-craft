package com.promoservice.engine.evaluator;

/**
 * Registry / Factory Pattern Interface for managing and looking up ConditionEvaluator strategies.
 */
public interface ConditionEvaluatorRegistry {

    void register(ConditionEvaluator evaluator);

    ConditionEvaluator getEvaluator(String operator);
}
