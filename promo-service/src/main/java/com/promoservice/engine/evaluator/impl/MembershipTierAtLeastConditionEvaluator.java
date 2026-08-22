package com.promoservice.engine.evaluator.impl;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.engine.evaluator.ConditionEvaluator;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Specialized Strategy Evaluator for Membership Status / Loyalty Tier comparison.
 * Checks if actor's membership tier is at least equal to or higher than the required tier
 * (e.g. PLATINUM > GOLD > SILVER > BRONZE).
 */
@Component
public class MembershipTierAtLeastConditionEvaluator implements ConditionEvaluator {

    private static final List<String> TIER_HIERARCHY = List.of(
            "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"
    );

    @Override
    public String getOperator() {
        return "MEMBERSHIP_TIER_AT_LEAST";
    }

    @Override
    public boolean evaluate(ConditionNode condition, CartContext cart, Actor actor) {
        if (condition == null || condition.getValue() == null || actor == null) {
            return false;
        }

        Object actorTierObj = actor.getAttribute("membership_tier");
        if (actorTierObj == null) {
            return false;
        }

        String actorTier = actorTierObj.toString().toUpperCase().trim();
        String requiredTier = condition.getValue().toString().toUpperCase().trim();

        int actorRank = TIER_HIERARCHY.indexOf(actorTier);
        int requiredRank = TIER_HIERARCHY.indexOf(requiredTier);

        if (actorRank == -1 || requiredRank == -1) {
            return false; // Unknown tier
        }

        return actorRank >= requiredRank;
    }
}
