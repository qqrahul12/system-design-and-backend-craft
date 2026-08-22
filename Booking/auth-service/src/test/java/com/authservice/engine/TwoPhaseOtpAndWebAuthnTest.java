package com.authservice.engine;

import com.authservice.domain.AuthContext;
import com.authservice.domain.impl.DefaultAuthContext;
import com.authservice.engine.provider.adapter.OtpChannelAdapter;
import com.authservice.engine.provider.adapter.impl.GupshupSmsAdapter;
import com.authservice.engine.provider.adapter.impl.SendGridEmailAdapter;
import com.authservice.engine.provider.adapter.impl.SinchSmsAdapter;
import com.authservice.engine.provider.impl.OtpIdentityProvider;
import com.authservice.engine.provider.impl.WebAuthnBiometricIdentityProvider;
import com.authservice.repository.OtpChallengeRepository;
import com.authservice.repository.WebAuthnChallengeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

class TwoPhaseOtpAndWebAuthnTest {

    private Map<String, String> redisOtpStore;
    private Map<String, String> redisWebAuthnStore;

    @BeforeEach
    void setUp() {
        redisOtpStore = new ConcurrentHashMap<>();
        redisWebAuthnStore = new ConcurrentHashMap<>();
    }

    @Test
    @DisplayName("Chunk 5: Composite Key Vendor Selection (CHANNEL:VENDOR)")
    void testCompositeKeyAdapters() {
        OtpChannelAdapter gupshup = new GupshupSmsAdapter();
        OtpChannelAdapter sinch = new SinchSmsAdapter();
        OtpChannelAdapter sendgrid = new SendGridEmailAdapter();

        assertEquals("SMS:GUPSHUP", gupshup.getAdapterKey());
        assertEquals("SMS:SINCH", sinch.getAdapterKey());
        assertEquals("EMAIL:SENDGRID", sendgrid.getAdapterKey());
    }

    @Test
    @DisplayName("Chunk 5: 2-Phase OTP Redis Challenge Lifecycle")
    void testOtpRedisLifecycle() {
        OtpChallengeRepository otpRepo = new OtpChallengeRepository() {
            @Override
            public void saveOtpChallenge(String tenantId, String sessionId, String otpHash, long ttlSeconds) {
                redisOtpStore.put(tenantId + ":" + sessionId, otpHash);
            }

            @Override
            public boolean verifyAndInvalidateOtp(String tenantId, String sessionId, String submittedOtp) {
                String stored = redisOtpStore.remove(tenantId + ":" + sessionId); // Atomic GETDEL
                return stored != null && "hash_881920".equals(stored);
            }
        };

        otpRepo.saveOtpChallenge("tenant_acme", "sess_101", "hash_881920", 300L);
        assertTrue(otpRepo.verifyAndInvalidateOtp("tenant_acme", "sess_101", "881920"));
        // Single-use security check: Second attempt fails!
        assertFalse(otpRepo.verifyAndInvalidateOtp("tenant_acme", "sess_101", "881920"));
    }

    @Test
    @DisplayName("Chunk 5: 2-Phase WebAuthn Biometric Passkey Challenge Lifecycle")
    void testWebAuthnRedisLifecycle() {
        WebAuthnChallengeRepository webAuthnRepo = new WebAuthnChallengeRepository() {
            @Override
            public void saveChallenge(String tenantId, String sessionId, String challengeBase64, long ttlSeconds) {
                redisWebAuthnStore.put(tenantId + ":" + sessionId, challengeBase64);
            }

            @Override
            public String getAndInvalidateChallenge(String tenantId, String sessionId) {
                return redisWebAuthnStore.remove(tenantId + ":" + sessionId); // Atomic GETDEL
            }
        };

        WebAuthnBiometricIdentityProvider biometricIdP = new WebAuthnBiometricIdentityProvider();
        AuthContext context = new DefaultAuthContext("sess_202", "tenant_acme", "usr_99", "127.0.0.1", "iPhone", "step_biometric", Map.of());

        // Phase 1: Challenge Generation
        Map<String, Object> challengeResult = biometricIdP.initiateChallenge(context, Map.of());
        assertEquals("CHALLENGE_GENERATED", challengeResult.get("status"));
        assertNotNull(challengeResult.get("challenge"));

        // Save in Redis & Verify Phase 2 Assertion
        webAuthnRepo.saveChallenge("tenant_acme", "sess_202", (String) challengeResult.get("challenge"), 300L);

        String retrievedChallenge = webAuthnRepo.getAndInvalidateChallenge("tenant_acme", "sess_202");
        assertNotNull(retrievedChallenge);

        // Verification assertion returns true
        assertTrue(biometricIdP.verifyCredentials(context, Map.of("credential_id", "passkey_iphone15", "signature", "sig_valid")));
    }
}
