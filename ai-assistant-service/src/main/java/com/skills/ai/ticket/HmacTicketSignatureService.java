package com.skills.ai.ticket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/**
 * Concrete implementation of TicketSignatureService using HMAC-SHA256.
 * Adheres to Liskov Substitution Principle (LSP) and can be substituted with RSA/Ed25519.
 */
@Slf4j
@Service
public class HmacTicketSignatureService implements TicketSignatureService {

    private static final String HMAC_SECRET = "cinemind-enterprise-gate-secret-key-2026";
    private static final String ALGORITHM = "HmacSHA256";

    @Override
    public String sign(String payload) {
        if (payload == null) {
            return "";
        }
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(HMAC_SECRET.getBytes(StandardCharsets.UTF_8), ALGORITHM);
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(rawHmac.length * 2);
            for (byte b : rawHmac) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("Failed to compute HMAC-SHA256 pass signature: {}", e.getMessage());
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    @Override
    public boolean verify(String payload, String signature) {
        if (payload == null || signature == null) {
            return false;
        }
        String computed = sign(payload);
        return MessageDigest.isEqual(
                computed.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
        );
    }
}
