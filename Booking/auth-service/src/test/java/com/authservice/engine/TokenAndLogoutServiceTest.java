package com.authservice.engine;

import com.authservice.domain.*;
import com.authservice.domain.impl.*;
import com.authservice.engine.token.impl.DefaultLogoutService;
import com.authservice.engine.token.impl.DefaultTokenService;
import com.authservice.repository.JwtBlacklistRepository;
import com.authservice.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

class TokenAndLogoutServiceTest {

    private DefaultTokenService tokenService;
    private DefaultLogoutService logoutService;
    private Map<String, RefreshToken> refreshTokenStore;
    private Map<String, Long> jtiBlacklist;

    @BeforeEach
    void setUp() {
        refreshTokenStore = new ConcurrentHashMap<>();
        jtiBlacklist = new ConcurrentHashMap<>();

        RefreshTokenRepository refreshRepo = new RefreshTokenRepository() {
            @Override
            public RefreshToken findByTokenHash(String tenantId, String tokenHash) {
                return refreshTokenStore.get(tenantId + ":" + tokenHash);
            }
            @Override
            public void save(RefreshToken refreshToken) {
                refreshTokenStore.put(refreshToken.getTenantId() + ":" + refreshToken.getTokenHash(), refreshToken);
            }
            @Override
            public void revokeTokenFamily(String tenantId, String tokenFamilyId) {
                for (Map.Entry<String, RefreshToken> entry : refreshTokenStore.entrySet()) {
                    if (entry.getKey().startsWith(tenantId) && tokenFamilyId.equals(entry.getValue().getTokenFamilyId())) {
                        RefreshToken old = entry.getValue();
                        refreshTokenStore.put(entry.getKey(), new DefaultRefreshToken(
                                old.getTokenId(), old.getTenantId(), old.getUserId(), old.getTokenFamilyId(),
                                old.getTokenHash(), "REVOKED", old.getDeviceId(), old.getCreatedAtTimestamp(), old.getExpiresAtTimestamp()
                        ));
                    }
                }
            }
            @Override
            public void revokeAllUserTokens(String tenantId, String userId) {
                for (Map.Entry<String, RefreshToken> entry : refreshTokenStore.entrySet()) {
                    if (entry.getKey().startsWith(tenantId) && userId.equals(entry.getValue().getUserId())) {
                        RefreshToken old = entry.getValue();
                        refreshTokenStore.put(entry.getKey(), new DefaultRefreshToken(
                                old.getTokenId(), old.getTenantId(), old.getUserId(), old.getTokenFamilyId(),
                                old.getTokenHash(), "REVOKED", old.getDeviceId(), old.getCreatedAtTimestamp(), old.getExpiresAtTimestamp()
                        ));
                    }
                }
            }
        };

        JwtBlacklistRepository blacklistRepo = new JwtBlacklistRepository() {
            @Override public void blacklistJti(String tenantId, String jti, long expiresAtTimestamp) { jtiBlacklist.put(tenantId + ":" + jti, expiresAtTimestamp); }
            @Override public boolean isJtiBlacklisted(String tenantId, String jti) { return jtiBlacklist.containsKey(tenantId + ":" + jti); }
            @Override public void updateUserTokenValidAfterTimestamp(String tenantId, String userId, long timestamp) {}
            @Override public long getUserTokenValidAfterTimestamp(String tenantId, String userId) { return 0L; }
        };

        tokenService = new DefaultTokenService(refreshRepo);
        logoutService = new DefaultLogoutService(refreshRepo, blacklistRepo);
    }

    @Test
    @DisplayName("Chunk 4: Token Issuance & Refresh Token Rotation")
    void testTokenIssuanceAndRotation() {
        AuthContext context = new DefaultAuthContext("s1", "tenant_acme", "usr_100", "127.0.0.1", "Browser", "complete", Map.of());
        TenantSecurityPolicy policy = new DefaultTenantSecurityPolicy("tenant_acme", true, true, null, 3600L, 86400L, 5);

        // Issue Initial Token Pair
        TokenPair pair1 = tokenService.issueTokens(context, Map.of(), policy);
        assertNotNull(pair1.accessToken());
        assertNotNull(pair1.refreshToken());

        // Refresh Token Rotation (Rotates RefreshToken #1 -> Issues RefreshToken #2)
        TokenPair pair2 = tokenService.refreshTokens("tenant_acme", pair1.refreshToken(), policy);
        assertNotNull(pair2.accessToken());
        assertNotNull(pair2.refreshToken());
        assertNotEquals(pair1.refreshToken(), pair2.refreshToken());
    }

    @Test
    @DisplayName("Chunk 4: Replay Attack Detection - Token Theft Triggers Family Revocation")
    void testReplayAttackDetection() {
        AuthContext context = new DefaultAuthContext("s1", "tenant_acme", "usr_100", "127.0.0.1", "Browser", "complete", Map.of());
        TenantSecurityPolicy policy = new DefaultTenantSecurityPolicy("tenant_acme", true, true, null, 3600L, 86400L, 5);

        TokenPair pair1 = tokenService.issueTokens(context, Map.of(), policy);

        // Legitimate User Refreshes Token #1 -> Token #1 is now ROTATED
        TokenPair pair2 = tokenService.refreshTokens("tenant_acme", pair1.refreshToken(), policy);

        // Attacker attempts to REUSE Token #1 -> Throws SecurityException & Revokes Family!
        assertThrows(SecurityException.class, () -> {
            tokenService.refreshTokens("tenant_acme", pair1.refreshToken(), policy);
        });
    }

    @Test
    @DisplayName("Chunk 4: Single-Device Logout & JTI Blacklisting")
    void testSingleDeviceLogout() {
        AuthContext context = new DefaultAuthContext("s1", "tenant_acme", "usr_100", "127.0.0.1", "Browser", "complete", Map.of());
        TenantSecurityPolicy policy = new DefaultTenantSecurityPolicy("tenant_acme", true, true, null, 3600L, 86400L, 5);

        TokenPair pair1 = tokenService.issueTokens(context, Map.of(), policy);

        boolean logoutResult = logoutService.logoutSingleDevice("tenant_acme", pair1.refreshToken(), "jti_12345", 3600L);
        assertTrue(logoutResult);
    }
}
