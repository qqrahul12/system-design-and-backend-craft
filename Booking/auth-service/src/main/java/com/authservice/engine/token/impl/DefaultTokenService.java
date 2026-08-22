package com.authservice.engine.token.impl;

import com.authservice.domain.AuthContext;
import com.authservice.domain.RefreshToken;
import com.authservice.domain.TenantSecurityPolicy;
import com.authservice.domain.TokenPair;
import com.authservice.domain.impl.DefaultRefreshToken;
import com.authservice.engine.token.TokenService;
import com.authservice.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * Service implementation of TokenService handling JWT issuance, Refresh Token Rotation,
 * and Token Theft / Replay Attack Detection.
 */
@Service
public class DefaultTokenService implements TokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    public DefaultTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Override
    public TokenPair issueTokens(AuthContext context, Map<String, Object> claims, TenantSecurityPolicy policy) {
        if (context == null) throw new IllegalArgumentException("Context cannot be null");

        long accessTtl = policy != null ? policy.getAccessTokenTtlSeconds() : 3600L;
        long refreshTtl = policy != null ? policy.getRefreshTokenTtlSeconds() : 86400L;

        String jti = "jti_" + UUID.randomUUID().toString();
        String accessToken = "jwt." + jti + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(context.getUserId().getBytes());

        String rawRefreshToken = "rt_" + UUID.randomUUID().toString() + "_" + UUID.randomUUID().toString();
        String familyId = "fam_" + UUID.randomUUID().toString().substring(0, 8);
        String tokenHash = hashToken(rawRefreshToken);

        long now = System.currentTimeMillis();
        RefreshToken refreshTokenRecord = new DefaultRefreshToken(
                UUID.randomUUID().toString(),
                context.getTenantId(),
                context.getUserId(),
                familyId,
                tokenHash,
                "ACTIVE",
                "device_default",
                now,
                now + (refreshTtl * 1000L)
        );

        refreshTokenRepository.save(refreshTokenRecord);

        return TokenPair.of(accessToken, rawRefreshToken, accessTtl);
    }

    @Override
    public TokenPair refreshTokens(String tenantId, String rawRefreshToken, TenantSecurityPolicy policy) {
        if (tenantId == null || rawRefreshToken == null) {
            throw new IllegalArgumentException("Invalid refresh request");
        }

        String tokenHash = hashToken(rawRefreshToken);
        RefreshToken existingToken = refreshTokenRepository.findByTokenHash(tenantId, tokenHash);

        if (existingToken == null || existingToken.isExpired()) {
            throw new IllegalArgumentException("Refresh token is invalid or expired");
        }

        // REPLAY ATTACK DETECTION (Token Theft Defense!)
        if ("ROTATED".equalsIgnoreCase(existingToken.getStatus()) || "REVOKED".equalsIgnoreCase(existingToken.getStatus())) {
            // A used token was submitted -> Token Theft Detected! Revoke entire token family!
            refreshTokenRepository.revokeTokenFamily(tenantId, existingToken.getTokenFamilyId());
            throw new SecurityException("Security Alert: Refresh Token Theft / Replay Attack Detected! All family sessions revoked.");
        }

        // Rotate existing token -> mark ROTATED
        RefreshToken rotatedToken = new DefaultRefreshToken(
                existingToken.getTokenId(),
                existingToken.getTenantId(),
                existingToken.getUserId(),
                existingToken.getTokenFamilyId(),
                existingToken.getTokenHash(),
                "ROTATED",
                existingToken.getDeviceId(),
                existingToken.getCreatedAtTimestamp(),
                existingToken.getExpiresAtTimestamp()
        );
        refreshTokenRepository.save(rotatedToken);

        // Issue NEW Refresh Token in the SAME family
        long accessTtl = policy != null ? policy.getAccessTokenTtlSeconds() : 3600L;
        long refreshTtl = policy != null ? policy.getRefreshTokenTtlSeconds() : 86400L;

        String newJti = "jti_" + UUID.randomUUID().toString();
        String newAccessToken = "jwt." + newJti + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(existingToken.getUserId().getBytes());

        String newRawRefreshToken = "rt_" + UUID.randomUUID().toString() + "_" + UUID.randomUUID().toString();
        String newTokenHash = hashToken(newRawRefreshToken);

        long now = System.currentTimeMillis();
        RefreshToken newTokenRecord = new DefaultRefreshToken(
                UUID.randomUUID().toString(),
                tenantId,
                existingToken.getUserId(),
                existingToken.getTokenFamilyId(), // Same Family
                newTokenHash,
                "ACTIVE",
                existingToken.getDeviceId(),
                now,
                now + (refreshTtl * 1000L)
        );
        refreshTokenRepository.save(newTokenRecord);

        return TokenPair.of(newAccessToken, newRawRefreshToken, accessTtl);
    }

    @Override
    public Map<String, Object> getJwksKeys(String tenantId) {
        return Map.of(
                "keys", java.util.List.of(
                        Map.of("kty", "RSA", "use", "sig", "alg", "RS256", "kid", "key_tenant_" + tenantId)
                )
        );
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }
}
