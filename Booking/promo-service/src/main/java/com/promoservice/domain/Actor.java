package com.promoservice.domain;

import java.util.Map;

/**
 * Interface representing the customer or business account context executing the promotion request.
 * Supports both B2C (User) and B2B (Account / Company) actors.
 */
public interface Actor {

    /**
     * Unique identifier for the user (B2C) or account (B2B).
     */
    String getActorId();

    /**
     * Actor type discriminator, e.g., "USER" or "ACCOUNT".
     */
    String getActorType();

    /**
     * Arbitrary actor metadata attributes (e.g. user_tier="VIP", region="EU", company_tier="WHOLESALE_GOLD").
     */
    Map<String, Object> getAttributes();

    /**
     * Helper to retrieve a typed attribute.
     */
    Object getAttribute(String key);
}
