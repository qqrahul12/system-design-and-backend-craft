package com.authservice.engine.token;

import com.authservice.domain.AuthContext;
import com.authservice.domain.TenantSecurityPolicy;
import com.authservice.domain.TokenPair;

import java.util.Map;

/**
 * Interface for the Token Service managing JWT Access Tokens, Refresh Token Rotation, and JWKS distribution.
 */
public interface TokenService {

    /**
     * Issues a new Access Token & Refresh Token pair for a completed login flow.
     */
    TokenPair issueTokens(AuthContext context, Map<String, Object> claims, TenantSecurityPolicy policy);

    /**
     * Rotates a refresh token and issues a new TokenPair.
     * Detects token reuse replay attacks and revokes token family on theft!
     */
    TokenPair refreshTokens(String tenantId, String rawRefreshToken, TenantSecurityPolicy policy);

    /**
     * Returns JSON Web Key Set (JWKS) public keys for tenant token verification.
     */
    Map<String, Object> getJwksKeys(String tenantId);
}
