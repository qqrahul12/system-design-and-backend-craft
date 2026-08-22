package com.authservice.domain.impl;

import com.authservice.domain.TenantFlowConfig;

import java.util.List;
import java.util.Map;

/**
 * Java 21 Record implementation of TenantFlowConfig interface.
 */
public record DefaultTenantFlowConfig(
        String tenantId,
        List<String> enabledPreAuthHookNames,
        List<String> enabledPostAuthHookNames,
        Map<String, Map<String, Object>> hookConfigs
) implements TenantFlowConfig {

    @Override
    public String getTenantId() {
        return tenantId;
    }

    @Override
    public List<String> getEnabledPreAuthHookNames() {
        return enabledPreAuthHookNames != null ? enabledPreAuthHookNames : List.of();
    }

    @Override
    public List<String> getEnabledPostAuthHookNames() {
        return enabledPostAuthHookNames != null ? enabledPostAuthHookNames : List.of();
    }

    @Override
    public Map<String, Map<String, Object>> getHookConfigs() {
        return hookConfigs != null ? hookConfigs : Map.of();
    }
}
