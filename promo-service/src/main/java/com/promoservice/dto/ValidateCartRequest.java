package com.promoservice.dto;

import com.promoservice.domain.impl.DefaultActor;
import com.promoservice.domain.impl.DefaultCartContext;
import com.promoservice.domain.impl.DefaultLineItem;

import java.util.List;
import java.util.Map;

/**
 * Request payload for cart validation.
 */
public record ValidateCartRequest(
        String cartId,
        String currency,
        long subtotalCents,
        long shippingCents,
        List<DefaultLineItem> items,
        Map<String, Object> cartMetadata,
        String actorId,
        String actorType,
        Map<String, Object> actorAttributes,
        List<String> promoCodes
) {
    public DefaultCartContext toCartContext(String tenantId) {
        return new DefaultCartContext(
                cartId != null ? cartId : "cart_default",
                tenantId,
                currency != null ? currency : "USD",
                subtotalCents,
                shippingCents,
                items != null ? items.stream().map(i -> (com.promoservice.domain.LineItem) i).toList() : List.of(),
                cartMetadata != null ? cartMetadata : Map.of()
        );
    }

    public DefaultActor toActor() {
        return new DefaultActor(
                actorId != null ? actorId : "anon_user",
                actorType != null ? actorType : "USER",
                actorAttributes != null ? actorAttributes : Map.of()
        );
    }
}
