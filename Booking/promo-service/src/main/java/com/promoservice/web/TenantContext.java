package com.promoservice.web;

/**
 * ThreadLocal Holder for Multi-Tenant TenantId context.
 */
public class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        String tenant = CURRENT_TENANT.get();
        return tenant != null ? tenant : "default_tenant";
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
