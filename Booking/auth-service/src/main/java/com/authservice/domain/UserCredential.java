package com.authservice.domain;

/**
 * Interface representing a stored user credential record in the tenant database.
 */
public interface UserCredential {

    String getCredentialId();

    String getUserId();

    String getTenantId();

    String getCredentialType(); // "PASSWORD", "OTP_SECRET", "WEBAUTHN_PUBLIC_KEY"

    String getPasswordHash(); // Encrypted Argon2id / BCrypt hash
}
