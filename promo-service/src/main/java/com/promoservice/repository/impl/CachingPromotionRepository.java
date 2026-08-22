package com.promoservice.repository.impl;

import com.booking.cache.Cache;
import com.promoservice.domain.PromotionDefinition;
import com.promoservice.domain.impl.DefaultPromotionDefinition;
import com.promoservice.repository.PromotionRepository;

public class CachingPromotionRepository {

    private final PromotionRepository delegate;
    private final Cache<String, PromotionDefinition> cache;

    public CachingPromotionRepository(PromotionRepository delegate, Cache<String, PromotionDefinition> cache) {
        this.delegate = delegate;
        this.cache = cache;
    }

    public PromotionDefinition findByTenantIdAndCode(String tenantId, String code) {
        String cacheKey = getCacheKey(tenantId, code);

        // 1. Check Cache (Cache Hit)
        PromotionDefinition cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        // 2. Cache Miss: Query DB via JpaRepository
        PromotionDefinition dbResult = delegate.findByTenantIdAndCode(tenantId, code);

        // 3. Populate Cache on Miss
        if (dbResult != null) {
            cache.put(cacheKey, dbResult);
        }

        return dbResult;
    }

    public PromotionDefinition save(PromotionDefinition promotionDefinition) {
        String cacheKey = getCacheKey(promotionDefinition.getTenantId(), promotionDefinition.getCode());
        if (promotionDefinition instanceof DefaultPromotionDefinition def) {
            delegate.save(def);
        }
        cache.put(cacheKey, promotionDefinition);
        return promotionDefinition;
    }

    public String getCacheKey(String tenantId, String code) {
        return "promotion-definition:" + tenantId + ":" + code;
    }
}
