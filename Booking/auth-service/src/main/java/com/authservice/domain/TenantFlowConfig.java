package com.authservice.domain;

import java.util.List;
import java.util.Map;

/**
 * Interface representing tenant-level flow configurations defining which pre-auth and post-auth hooks are enabled.
 */
public interface TenantFlowConfig {

    String getTenantId();

    List<String> getEnabledPreAuthHookNames();

    List<String> getEnabledPostAuthHookNames();

    /**
     * Configuration parameters per hook (e.g. {"GEO_IP_BLOCK": {"enforce_whitelist": false}}).
     */
    Map<String, Map<String, Object>> getHookConfigs();
}
