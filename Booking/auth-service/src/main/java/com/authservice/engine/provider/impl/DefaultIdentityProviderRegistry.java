package com.authservice.engine.provider.impl;

import com.authservice.engine.provider.IdentityProvider;
import com.authservice.engine.provider.IdentityProviderRegistry;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring Component implementation of IdentityProviderRegistry.
 * Auto-collects all registered IdentityProvider strategy beans into a lookup map.
 */
@Component
public class DefaultIdentityProviderRegistry implements IdentityProviderRegistry {

    private final Map<String, IdentityProvider> providerMap = new ConcurrentHashMap<>();

    public DefaultIdentityProviderRegistry(List<IdentityProvider> providers) {
        if (providers != null) {
            providers.forEach(this::register);
        }
    }

    @Override
    public void register(IdentityProvider provider) {
        if (provider != null && provider.getProviderType() != null) {
            providerMap.put(provider.getProviderType().toUpperCase(), provider);
        }
    }

    @Override
    public IdentityProvider getProvider(String providerType) {
        if (providerType == null) return null;
        return providerMap.get(providerType.toUpperCase());
    }
}
