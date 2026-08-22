package com.promoservice.domain;

import java.time.Instant;
import java.util.List;

/**
 * Interface representing a complete promotion campaign definition.
 */
public interface PromotionDefinition {

    String getPromotionId();

    String getTenantId();

    String getName();

    String getPromoType(); // "AUTOMATIC", "CODE_REQUIRED", "CONTRACT"

    String getCode(); // e.g. "SUMMER20" or null for automatic

    int getPriority();

    boolean isExclusive();

    String getStackingGroup(); // "ITEM_DISCOUNT", "CART_DISCOUNT", "SHIPPING"

    ConditionNode getConditionRoot();

    List<ActionDefinition> getActions();

    Instant getStartTime();

    Instant getEndTime();

    boolean isActive();
}
