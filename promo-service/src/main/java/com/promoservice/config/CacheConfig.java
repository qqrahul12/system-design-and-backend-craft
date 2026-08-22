package com.promoservice.config;

import com.booking.cache.Cache;
import com.booking.cache.impl.caffeine.CaffeineCacheAdapter;
import com.promoservice.domain.PromotionDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CacheConfig {

    @Bean
    public Cache<String, PromotionDefinition> promotionCache() {
        return new CaffeineCacheAdapter<>(1000, 60000);
    }
}
