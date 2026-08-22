package com.authservice.engine.provider;

/**
 * Registry / Factory Pattern Interface managing IdentityProvider strategies.
 */
public interface IdentityProviderRegistry {

    void register(IdentityProvider provider);

    IdentityProvider getProvider(String providerType);
}
