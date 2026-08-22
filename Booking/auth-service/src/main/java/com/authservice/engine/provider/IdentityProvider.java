package com.authservice.engine.provider;

import com.authservice.domain.AuthContext;
import java.util.Map;

/**
 * Strategy Pattern Interface supporting both 1-Step (Password) and 2-Step (OTP, WebAuthn Biometrics) providers.
 * Single Responsibility: Pure credential initiation & verification.
 * Flow orchestration & step transitions belong exclusively to AuthFlowEngine.
 */
public interface IdentityProvider {

    /**
     * Provider Discriminator: "PASSWORD", "OTP", "WEBAUTHN_BIOMETRIC", "GOOGLE_OAUTH", "SAML_SSO".
     */
    String getProviderType();

    /**
     * Returns true if this provider requires a 2-Phase Challenge (e.g. OTP, WebAuthn Passkeys).
     */
    default boolean isChallengeRequired() {
        return false;
    }

    /**
     * Phase 1 (For 2-Step Providers): Initiates the challenge (e.g. dispatches OTP SMS/Email, or generates WebAuthn challenge bytes).
     * Returns metadata payload to send back to client (e.g. {"otp_ttl_seconds": 300, "masked_phone": "+1 *** *** 1234"}).
     */
    default Map<String, Object> initiateChallenge(AuthContext context, Map<String, Object> payload) {
        return Map.of();
    }

    /**
     * Phase 2 (Primary Verification): Verifies the credential, OTP code, or WebAuthn signature.
     *
     * @param context     Current authentication thread context.
     * @param credentials Incoming credentials (e.g. {"password": "..."}, {"otp_code": "881920"}, {"signature": "..."}).
     * @return true if credentials are valid, false otherwise.
     */
    boolean verifyCredentials(AuthContext context, Map<String, Object> credentials);
}
