package com.promoservice.config;

import com.promoservice.web.TenantContext;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Spring AbstractRoutingDataSource for promo-service that dynamically routes database connections
 * based on the current request thread's TenantContext.
 */
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantId();
    }
}
