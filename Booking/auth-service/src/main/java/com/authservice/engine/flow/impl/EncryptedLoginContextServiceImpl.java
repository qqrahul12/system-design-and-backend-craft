package com.authservice.engine.flow.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.authservice.domain.TransientLoginContext;
import com.authservice.engine.flow.EncryptedLoginContextService;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Production implementation of EncryptedLoginContextService using AES-256-GCM authenticated encryption.
 * Protects transient multi-step login context from client-side tampering or inspection.
 */
@Service
public class EncryptedLoginContextServiceImpl implements EncryptedLoginContextService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int IV_LENGTH_BYTES = 12;

    private final SecretKey secretKey;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    public static class TransientLoginContextDto implements TransientLoginContext {
        @JsonProperty("tenantId") public String tenantId;
        @JsonProperty("userId") public String userId;
        @JsonProperty("deviceId") public String deviceId;
        @JsonProperty("clientIp") public String clientIp;
        @JsonProperty("completedStepIds") public List<String> completedStepIds;
        @JsonProperty("verifiedFactors") public List<String> verifiedFactors;
        @JsonProperty("challengeState") public Map<String, Object> challengeState;
        @JsonProperty("createdAtTimestamp") public long createdAtTimestamp;
        @JsonProperty("expiresAtTimestamp") public long expiresAtTimestamp;

        public TransientLoginContextDto() {}

        public TransientLoginContextDto(TransientLoginContext source) {
            if (source != null) {
                this.tenantId = source.getTenantId();
                this.userId = source.getUserId();
                this.deviceId = source.getDeviceId();
                this.clientIp = source.getClientIp();
                this.completedStepIds = source.getCompletedStepIds();
                this.verifiedFactors = source.getVerifiedFactors();
                this.challengeState = source.getChallengeState();
                this.createdAtTimestamp = source.getCreatedAtTimestamp();
                this.expiresAtTimestamp = source.getExpiresAtTimestamp();
            }
        }

        @Override public String getTenantId() { return tenantId; }
        @Override public String getUserId() { return userId; }
        @Override public String getDeviceId() { return deviceId; }
        @Override public String getClientIp() { return clientIp; }
        @Override public List<String> getCompletedStepIds() { return completedStepIds != null ? completedStepIds : List.of(); }
        @Override public List<String> getVerifiedFactors() { return verifiedFactors != null ? verifiedFactors : List.of(); }
        @Override public Map<String, Object> getChallengeState() { return challengeState != null ? challengeState : Map.of(); }
        @Override public long getCreatedAtTimestamp() { return createdAtTimestamp; }
        @Override public long getExpiresAtTimestamp() { return expiresAtTimestamp; }
    }

    public EncryptedLoginContextServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.secretKey = generateSecretKey();
    }

    private SecretKey generateSecretKey() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance("AES");
            keyGen.init(256);
            return keyGen.generateKey();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize AES key generator", e);
        }
    }

    @Override
    public String encryptContext(TransientLoginContext context) {
        if (context == null) return null;

        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            TransientLoginContextDto dto = new TransientLoginContextDto(context);
            byte[] jsonBytes = objectMapper.writeValueAsBytes(dto);
            byte[] cipherText = cipher.doFinal(jsonBytes);

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getUrlEncoder().withoutPadding().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt login context", e);
        }
    }

    @Override
    public TransientLoginContext decryptContext(String jweToken) {
        if (jweToken == null || jweToken.isBlank()) return null;

        try {
            byte[] combined = Base64.getUrlDecoder().decode(jweToken);
            if (combined.length <= IV_LENGTH_BYTES) return null;

            byte[] iv = new byte[IV_LENGTH_BYTES];
            byte[] cipherText = new byte[combined.length - IV_LENGTH_BYTES];

            System.arraycopy(combined, 0, iv, 0, IV_LENGTH_BYTES);
            System.arraycopy(combined, IV_LENGTH_BYTES, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            byte[] jsonBytes = cipher.doFinal(cipherText);
            return objectMapper.readValue(jsonBytes, TransientLoginContextDto.class);
        } catch (Exception e) {
            return null;
        }
    }
}
