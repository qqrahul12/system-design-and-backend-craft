package com.authservice.engine.token.impl;

import com.authservice.domain.RefreshToken;
import com.authservice.domain.impl.DefaultRefreshToken;
import com.authservice.engine.token.LogoutService;
import com.authservice.repository.JwtBlacklistRepository;
import com.authservice.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Service implementation of LogoutService handling single-device and global all-device revocation.
 */
@Service
public class DefaultLogoutService implements LogoutService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtBlacklistRepository jwtBlacklistRepository;

    public DefaultLogoutService(RefreshTokenRepository refreshTokenRepository, JwtBlacklistRepository jwtBlacklistRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtBlacklistRepository = jwtBlacklistRepository;
    }

    @Override
    public boolean logoutSingleDevice(String tenantId, String rawRefreshToken, String accessTokenJti, long accessTtlSeconds) {
        if (tenantId == null) return false;

        // 1. Revoke specific refresh token
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = hashToken(rawRefreshToken);
            RefreshToken existing = refreshTokenRepository.findByTokenHash(tenantId, tokenHash);
            if (existing != null) {
                RefreshToken revoked = new DefaultRefreshToken(
                        existing.getTokenId(), existing.getTenantId(), existing.getUserId(),
                        existing.getTokenFamilyId(), existing.getTokenHash(), "REVOKED",
                        existing.getDeviceId(), existing.getCreatedAtTimestamp(), existing.getExpiresAtTimestamp()
                );
                refreshTokenRepository.save(revoked);
            }
        }

        // 2. Blacklist Access Token JTI until expiration
        if (accessTokenJti != null && !accessTokenJti.isBlank()) {
            long expiresAt = System.currentTimeMillis() + (accessTtlSeconds * 1000L);
            jwtBlacklistRepository.blacklistJti(tenantId, accessTokenJti, expiresAt);
        }

        return true;
    }

    @Override
    public boolean logoutAllDevices(String tenantId, String userId) {
        if (tenantId == null || userId == null) return false;

        // 1. Revoke all refresh tokens in database/Redis
        refreshTokenRepository.revokeAllUserTokens(tenantId, userId);

        // 2. Update user_token_valid_after_timestamp = NOW to globally reject existing JWT access tokens
        jwtBlacklistRepository.updateUserTokenValidAfterTimestamp(tenantId, userId, System.currentTimeMillis());

        return true;
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
