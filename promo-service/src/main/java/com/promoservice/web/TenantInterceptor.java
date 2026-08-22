package com.promoservice.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Spring Web Interceptor extracting X-Tenant-Id HTTP Header for Multi-Tenancy context isolation.
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    public static final String TENANT_HEADER = "X-Tenant-Id";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader(TENANT_HEADER);
        if (tenantId != null && !tenantId.isBlank()) {
            TenantContext.setTenantId(tenantId.trim());
        } else {
            TenantContext.setTenantId("default_tenant");
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear(); // Always clear ThreadLocal to prevent memory leaks in thread pools!
    }
}
