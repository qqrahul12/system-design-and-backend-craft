package com.authservice.domain;

import com.authservice.config.TenantRoutingDataSource;
import com.authservice.domain.impl.*;
import com.authservice.engine.provider.IdentityProviderRegistry;
import com.authservice.engine.provider.impl.DefaultIdentityProviderRegistry;
import com.authservice.engine.provider.impl.OtpIdentityProvider;
import com.authservice.engine.provider.impl.PasswordIdentityProvider;
import com.authservice.engine.provider.impl.WebAuthnBiometricIdentityProvider;
import com.authservice.repository.UserCredentialsRepository;
import com.authservice.web.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AuthDomainTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Chunk 1: Verify Dynamic Tenant Context & Routing Lookup")
    void testTenantRoutingContext() {
        TenantContext.setTenantId("tenant_acme");
        assertEquals("tenant_acme", TenantContext.getTenantId());

        TenantRoutingDataSource dataSource = new TenantRoutingDataSource();
        assertEquals("tenant_acme", TenantContext.getTenantId());

        TenantContext.clear();
        assertEquals("default_tenant", TenantContext.getTenantId());
    }

    @Test
    @DisplayName("Chunk 1: Verify Domain Interfaces & Java 21 Record Implementations")
    void testDomainRecords() {
        PasswordPolicy passwordPolicy = new DefaultPasswordPolicy(12, true, true, true, 90, 5);
        assertEquals(12, passwordPolicy.getMinLength());
        assertTrue(passwordPolicy.isRequireUppercase());

        TenantSecurityPolicy tenantPolicy = new DefaultTenantSecurityPolicy(
                "tenant_acme", true, true, passwordPolicy, 3600L, 86400L, 5
        );
        assertEquals("tenant_acme", tenantPolicy.getTenantId());
        assertTrue(tenantPolicy.isMfaRequired());

        AuthContext context = new DefaultAuthContext("sess_1001", "tenant_acme", "usr_9918", "192.168.1.1", "Mozilla", "step_1_primary", Map.of());
        assertEquals("usr_9918", context.getUserId());
        assertEquals("tenant_acme", context.getTenantId());
    }

    @Test
    @DisplayName("Chunk 1: Verify SRP 1-Step PasswordIdentityProvider Strategy")
    void testPasswordIdentityProvider() {
        UserCredentialsRepository mockRepo = new UserCredentialsRepository() {
            @Override
            public UserCredential findByUserId(String userId) {
                return new DefaultUserCredential("cred_1", "usr_9918", "tenant_acme", "PASSWORD", "hash_Secret123!");
            }
            @Override
            public void save(UserCredential credential) {}
        };

        PasswordIdentityProvider passwordIdP = new PasswordIdentityProvider(mockRepo);
        assertEquals("PASSWORD", passwordIdP.getProviderType());
        assertFalse(passwordIdP.isChallengeRequired());

        AuthContext context = new DefaultAuthContext("sess_1", "tenant_acme", "usr_9918", "127.0.0.1", "Browser", "step_1", Map.of());

        assertTrue(passwordIdP.verifyCredentials(context, Map.of("password", "Secret123!")));
        assertFalse(passwordIdP.verifyCredentials(context, Map.of("password", "WrongPassword")));
    }

    @Test
    @DisplayName("Chunk 1: Verify 2-Step OtpIdentityProvider Strategy (Initiate & Verify)")
    void testOtpIdentityProvider() {
        OtpIdentityProvider otpIdP = new OtpIdentityProvider();
        assertEquals("OTP", otpIdP.getProviderType());
        assertTrue(otpIdP.isChallengeRequired());

        AuthContext context = new DefaultAuthContext("sess_2", "tenant_acme", "usr_9918", "127.0.0.1", "Browser", "step_otp", Map.of());

        Map<String, Object> challengeResult = otpIdP.initiateChallenge(context, Map.of("phone", "+123456789"));
        assertEquals("OTP_SENT", challengeResult.get("status"));
        assertEquals(300, challengeResult.get("ttl_seconds"));

        assertTrue(otpIdP.verifyCredentials(context, Map.of("otp_code", "881920")));
        assertFalse(otpIdP.verifyCredentials(context, Map.of("otp_code", "000000")));
    }

    @Test
    @DisplayName("Chunk 1: Verify 2-Step WebAuthnBiometricIdentityProvider Strategy")
    void testWebAuthnBiometricIdentityProvider() {
        WebAuthnBiometricIdentityProvider biometricIdP = new WebAuthnBiometricIdentityProvider();
        assertEquals("WEBAUTHN_BIOMETRIC", biometricIdP.getProviderType());
        assertTrue(biometricIdP.isChallengeRequired());

        AuthContext context = new DefaultAuthContext("sess_3", "tenant_acme", "usr_9918", "127.0.0.1", "MobileApp", "step_biometric", Map.of());

        Map<String, Object> challengeResult = biometricIdP.initiateChallenge(context, Map.of());
        assertEquals("CHALLENGE_GENERATED", challengeResult.get("status"));
        assertNotNull(challengeResult.get("challenge"));

        assertTrue(biometricIdP.verifyCredentials(context, Map.of(
                "credential_id", "passkey_iphone15",
                "signature", "valid_sig_ecdsa_99812"
        )));
    }

    @Test
    @DisplayName("Chunk 1: Verify IdentityProviderRegistry Lookup")
    void testRegistryLookup() {
        UserCredentialsRepository mockRepo = new UserCredentialsRepository() {
            @Override
            public UserCredential findByUserId(String userId) {
                return null;
            }
            @Override
            public void save(UserCredential credential) {}
        };

        IdentityProviderRegistry registry = new DefaultIdentityProviderRegistry(List.of(
                new PasswordIdentityProvider(mockRepo),
                new OtpIdentityProvider(),
                new WebAuthnBiometricIdentityProvider()
        ));

        assertNotNull(registry.getProvider("PASSWORD"));
        assertNotNull(registry.getProvider("OTP"));
        assertNotNull(registry.getProvider("WEBAUTHN_BIOMETRIC"));
        assertNull(registry.getProvider("UNKNOWN_PROVIDER"));
    }
}
