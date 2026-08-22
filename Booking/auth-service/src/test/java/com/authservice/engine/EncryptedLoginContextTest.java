package com.authservice.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.authservice.domain.TransientLoginContext;
import com.authservice.domain.impl.DefaultTransientLoginContext;
import com.authservice.engine.flow.impl.EncryptedLoginContextServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class EncryptedLoginContextTest {

    private EncryptedLoginContextServiceImpl encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptedLoginContextServiceImpl(new ObjectMapper());
    }

    @Test
    @DisplayName("Chunk 3: AES-256-GCM JWE Encryption & Decryption Test")
    void testJweEncryptionDecryption() {
        long now = System.currentTimeMillis();
        TransientLoginContext original = new DefaultTransientLoginContext(
                "tenant_acme", "usr_1001", "device_macbook_pro", "192.168.1.50",
                List.of("step_1_password"), List.of("PASSWORD"),
                Map.of("otp_hash", "hash_881920"), now, now + 300000L
        );

        // Encrypt to JWE String
        String jweToken = encryptionService.encryptContext(original);
        assertNotNull(jweToken);
        assertFalse(jweToken.isBlank());

        // Decrypt JWE String
        TransientLoginContext decrypted = encryptionService.decryptContext(jweToken);
        assertNotNull(decrypted);
        assertEquals("tenant_acme", decrypted.getTenantId());
        assertEquals("usr_1001", decrypted.getUserId());
        assertEquals("device_macbook_pro", decrypted.getDeviceId());
        assertEquals("192.168.1.50", decrypted.getClientIp());
        assertEquals(List.of("PASSWORD"), decrypted.getVerifiedFactors());
    }

    @Test
    @DisplayName("Chunk 3: Tamper Protection Test - Corrupted JWE Token Fails Decryption")
    void testTamperProtection() {
        long now = System.currentTimeMillis();
        TransientLoginContext original = new DefaultTransientLoginContext(
                "tenant_acme", "usr_1001", "device_macbook_pro", "192.168.1.50",
                List.of("step_1_password"), List.of("PASSWORD"),
                Map.of(), now, now + 300000L
        );

        String jweToken = encryptionService.encryptContext(original);

        // Corrupt token string
        String tamperedToken = jweToken.substring(0, jweToken.length() - 4) + "XXXX";

        // Decryption fails cleanly due to AES-GCM Auth Tag mismatch!
        TransientLoginContext result = encryptionService.decryptContext(tamperedToken);
        assertNull(result, "Tampered JWE token must fail decryption!");
    }
}
