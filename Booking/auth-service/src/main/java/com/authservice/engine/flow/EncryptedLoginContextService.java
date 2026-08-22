package com.authservice.engine.flow;

import com.authservice.domain.TransientLoginContext;

/**
 * Service interface for encrypting and decrypting transient login context tokens using AES-256-GCM (JWE).
 */
public interface EncryptedLoginContextService {

    /**
     * Encrypts a TransientLoginContext into a tamper-proof JWE token string.
     */
    String encryptContext(TransientLoginContext context);

    /**
     * Decrypts and verifies a JWE token string back into a TransientLoginContext object.
     * Returns null if signature verification fails or token is tampered.
     */
    TransientLoginContext decryptContext(String jweToken);
}
