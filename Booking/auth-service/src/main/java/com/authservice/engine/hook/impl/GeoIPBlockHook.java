package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.engine.hook.PreAuthHook;
import com.authservice.repository.IpBlacklistRepository;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Pre-Auth Hook enforcing Tenant Geographic / IP Blacklists dynamically from Database / Redis.
 * Zero redeployment required when security teams update IP blacklists.
 */
@Component
public class GeoIPBlockHook implements PreAuthHook {

    private final IpBlacklistRepository ipBlacklistRepository;

    public GeoIPBlockHook(IpBlacklistRepository ipBlacklistRepository) {
        this.ipBlacklistRepository = ipBlacklistRepository;
    }

    @Override
    public String getHookName() {
        return "GEO_IP_BLOCK";
    }

    @Override
    public int getOrder() {
        return 2;
    }

    @Override
    public PreAuthResult execute(AuthContext context, Map<String, Object> payload) {
        if (context != null && context.getClientIp() != null) {
            boolean isBlacklisted = ipBlacklistRepository.isIpBlacklisted(context.getTenantId(), context.getClientIp());
            if (isBlacklisted) {
                return PreAuthResult.block("Client IP address is blacklisted by tenant security policy");
            }
        }
        return PreAuthResult.allow();
    }
}
