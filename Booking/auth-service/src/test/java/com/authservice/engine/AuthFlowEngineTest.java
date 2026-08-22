package com.authservice.engine;

import com.authservice.domain.*;
import com.authservice.domain.impl.DefaultAuthContext;
import com.authservice.domain.impl.DefaultTenantFlowConfig;
import com.authservice.domain.impl.DefaultUserCredential;
import com.authservice.engine.flow.impl.DefaultAuthFlowEngine;
import com.authservice.engine.hook.impl.*;
import com.authservice.engine.provider.impl.DefaultIdentityProviderRegistry;
import com.authservice.engine.provider.impl.OtpIdentityProvider;
import com.authservice.engine.provider.impl.PasswordIdentityProvider;
import com.authservice.engine.provider.impl.WebAuthnBiometricIdentityProvider;
import com.authservice.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

class AuthFlowEngineTest {

    private DefaultAuthFlowEngine authFlowEngine;

    @BeforeEach
    void setUp() {
        UserCredentialsRepository userRepo = new UserCredentialsRepository() {
            @Override public UserCredential findByUserId(String userId) { return new DefaultUserCredential("c1", userId, "tenant_acme", "PASSWORD", "hash_Secret123!"); }
            @Override public void save(UserCredential credential) {}
        };
        IpBlacklistRepository ipRepo = new IpBlacklistRepository() {
            @Override public boolean isIpBlacklisted(String tenantId, String clientIp) { return false; }
            @Override public void addBlacklistedIp(String tenantId, String clientIp, long ttlSeconds) {}
        };
        RateLimitRepository rateRepo = new RateLimitRepository() {
            @Override public boolean isRateLimited(String tenantId, String clientIp, int maxAllowedAttempts) { return false; }
            @Override public void recordFailedAttempt(String tenantId, String clientIp) {}
        };
        AuditLogRepository auditRepo = (tenantId, userId, eventType, clientIp, metadata) -> {};
        TenantFlowConfigRepository flowConfigRepo = new TenantFlowConfigRepository() {
            @Override public TenantFlowConfig findByTenantId(String tenantId) { return new DefaultTenantFlowConfig(tenantId, List.of("RATE_LIMIT"), List.of("JWT_CLAIM_ENRICHER"), Map.of()); }
            @Override public void save(TenantFlowConfig flowConfig) {}
        };

        DefaultAuthHookPipelineEngine hookEngine = new DefaultAuthHookPipelineEngine(
                flowConfigRepo,
                List.of(new BotDetectionHook(), new GeoIPBlockHook(ipRepo), new RateLimitHook(rateRepo)),
                List.of(new JWTClaimEnricherHook(), new AuditLogHook(auditRepo))
        );

        DefaultIdentityProviderRegistry providerRegistry = new DefaultIdentityProviderRegistry(List.of(
                new PasswordIdentityProvider(userRepo),
                new OtpIdentityProvider(),
                new WebAuthnBiometricIdentityProvider()
        ));

        AuthFlowGraphRepository flowGraphRepo = new AuthFlowGraphRepository() {
            @Override public AuthFlowGraph findByTenantId(String tenantId) { return null; }
            @Override public void save(AuthFlowGraph flowGraph) {}
        };

        AuthSessionRepository sessionRepo = new AuthSessionRepository() {
            private final Map<String, AuthSession> store = new ConcurrentHashMap<>();
            @Override public AuthSession findBySessionId(String tenantId, String sessionId) { return store.get(sessionId); }
            @Override public void saveSession(AuthSession session, long ttlSeconds) { store.put(session.getSessionId(), session); }
            @Override public void deleteSession(String tenantId, String sessionId) { store.remove(sessionId); }
            @Override public int countActiveSessions(String tenantId, String userId) { return 0; }
            @Override public List<AuthSession> findActiveSessions(String tenantId, String userId) { return new ArrayList<>(store.values()); }
        };

        authFlowEngine = new DefaultAuthFlowEngine(hookEngine, providerRegistry, flowGraphRepo, sessionRepo);
    }

    @Test
    @DisplayName("Chunk 3: Test Password Authentication & Successful Token Issuance")
    void testPasswordAuthSuccess() {
        AuthContext context = new DefaultAuthContext("s1", "tenant_acme", "usr_9918", "127.0.0.1", "Browser", "step_primary", Map.of());

        AuthFlowResult result = authFlowEngine.advanceFlow(context, Map.of("method", "PASSWORD", "password", "Secret123!"));

        assertTrue(result.isComplete());
        assertEquals("SUCCESS", result.getStatus());
        assertNotNull(result.getAccessToken());
        assertNotNull(result.getRefreshToken());
    }

    @Test
    @DisplayName("Chunk 3: Test Force Change Password Step Transition")
    void testForceChangePasswordTransition() {
        AuthContext context = new DefaultAuthContext("s2", "tenant_acme", "usr_new", "127.0.0.1", "Browser", "step_primary", Map.of("must_change_password", true));

        AuthFlowResult result = authFlowEngine.advanceFlow(context, Map.of("method", "PASSWORD", "password", "Secret123!"));

        assertFalse(result.isComplete());
        assertEquals("FORCE_CHANGE_PASSWORD", result.getStatus());
        assertEquals("step_force_change_password", result.getNextRequiredStepId());
    }

    @Test
    @DisplayName("Chunk 3: Test 2-Phase OTP Challenge Flow (Initiate -> Verify)")
    void testOtpTwoPhaseFlow() {
        AuthContext context = new DefaultAuthContext("s3", "tenant_acme", "usr_9918", "127.0.0.1", "Browser", "step_otp", Map.of());

        AuthFlowResult phase1 = authFlowEngine.advanceFlow(context, Map.of("method", "OTP", "phone", "+123456789"));
        assertEquals("CHALLENGE_REQUIRED", phase1.getStatus());
        assertEquals("step_verify_challenge", phase1.getNextRequiredStepId());

        AuthFlowResult phase2 = authFlowEngine.advanceFlow(context, Map.of("method", "OTP", "otp_code", "881920"));
        assertTrue(phase2.isComplete());
        assertEquals("SUCCESS", phase2.getStatus());
        assertNotNull(phase2.getAccessToken());
    }
}
