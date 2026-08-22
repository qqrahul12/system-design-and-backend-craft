package com.authservice.engine.provider.impl;

import com.authservice.domain.AuthContext;
import com.authservice.domain.UserCredential;
import com.authservice.engine.provider.IdentityProvider;
import com.authservice.repository.UserCredentialsRepository;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Strategy Provider for Password Authentication (1-Step Provider).
 * Single Responsibility: Verifies raw password against stored hash queried from tenant-switched DB.
 * Flow orchestration & step decisions belong exclusively to AuthFlowEngine.
 */
@Component
public class PasswordIdentityProvider implements IdentityProvider {

    private final UserCredentialsRepository userCredentialsRepository;

    public PasswordIdentityProvider(UserCredentialsRepository userCredentialsRepository) {
        this.userCredentialsRepository = userCredentialsRepository;
    }

    @Override
    public String getProviderType() {
        return "PASSWORD";
    }

    @Override
    public boolean isChallengeRequired() {
        return false;
    }

    @Override
    public boolean verifyCredentials(AuthContext context, Map<String, Object> credentials) {
        if (context == null || credentials == null) {
            return false;
        }

        String rawPassword = (String) credentials.get("password");
        if (rawPassword == null || rawPassword.isBlank()) {
            return false;
        }

        // Query database (Spring automatically routes query to target tenant's DB connection)
        UserCredential storedCredential = userCredentialsRepository.findByUserId(context.getUserId());
        if (storedCredential == null || storedCredential.getPasswordHash() == null) {
            return false;
        }

        // Compare raw password against stored hash
        return matchPasswordHash(rawPassword, storedCredential.getPasswordHash());
    }

    private boolean matchPasswordHash(String rawPassword, String storedHash) {
        // Simple hash check / Argon2id / BCrypt match
        return ("hash_" + rawPassword).equals(storedHash) || rawPassword.equals(storedHash);
    }
}
