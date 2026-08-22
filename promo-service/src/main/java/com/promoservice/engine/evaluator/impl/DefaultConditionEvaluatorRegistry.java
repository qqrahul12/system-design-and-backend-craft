package com.promoservice.engine.evaluator.impl;

import com.promoservice.engine.evaluator.ConditionEvaluator;
import com.promoservice.engine.evaluator.ConditionEvaluatorRegistry;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring Component managing registry lookup for ConditionEvaluator strategies.
 * Automatically injects all ConditionEvaluator Spring beans.
 */
@Component
public class DefaultConditionEvaluatorRegistry implements ConditionEvaluatorRegistry {

    private final Map<String, ConditionEvaluator> registry = new ConcurrentHashMap<>();

    public DefaultConditionEvaluatorRegistry(List<ConditionEvaluator> evaluators) {
        for (ConditionEvaluator evaluator : evaluators) {
            register(evaluator);
        }
    }

    @Override
    public void register(ConditionEvaluator evaluator) {
        if (evaluator != null && evaluator.getOperator() != null) {
            registry.put(evaluator.getOperator().toUpperCase(), evaluator);
        }
    }

    @Override
    public ConditionEvaluator getEvaluator(String operator) {
        if (operator == null) return null;
        return registry.get(operator.toUpperCase());
    }
}
