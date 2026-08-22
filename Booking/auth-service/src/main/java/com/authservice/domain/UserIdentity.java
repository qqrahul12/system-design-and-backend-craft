package com.authservice.domain;

import java.util.Map;

/**
 * Interface representing a user's linked identity credential (Password, Google OAuth, SAML, WebAuthn Biometric).
 */
public interface UserIdentity {

    String getIdentityId();

    String getUserId();

    String getTenantId();

    /**
     * Provider type discriminator: "PASSWORD", "OTP", "GOOGLE_OAUTH", "SAML_SSO", "WEBAUTHN_BIOMETRIC".
     */
    String getProviderType();

    String getExternalSubjectId();

    String getEmail();

    Map<String, Object> getAttributes();
}
