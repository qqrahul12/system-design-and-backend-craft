package com.authservice.engine;

import com.authservice.domain.AuthContext;
import com.authservice.domain.TenantFlowConfig;
import com.authservice.domain.impl.DefaultAuthContext;
import com.authservice.domain.impl.DefaultTenantFlowConfig;
import com.authservice.engine.hook.PostAuthHook;
import com.authservice.engine.hook.PreAuthHook;
import com.authservice.engine.hook.impl.*;
import com.authservice.repository.AuditLogRepository;
import com.authservice.repository.IpBlacklistRepository;
import com.authservice.repository.RateLimitRepository;
import com.authservice.repository.TenantFlowConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AuthHookPipelineTest {

    private DefaultAuthHookPipelineEngine pipelineEngine;

    @BeforeEach
    void setUp() {
        IpBlacklistRepository ipRepo = new IpBlacklistRepository() {
            @Override public boolean isIpBlacklisted(String tenantId, String clientIp) { return "10.0.0.99".equals(clientIp); }
            @Override public void addBlacklistedIp(String tenantId, String clientIp, long ttlSeconds) {}
        };
        RateLimitRepository rateRepo = new RateLimitRepository() {
            @Override public boolean isRateLimited(String tenantId, String clientIp, int maxAllowedAttempts) { return false; }
            @Override public void recordFailedAttempt(String tenantId, String clientIp) {}
        };
        AuditLogRepository auditRepo = (tenantId, userId, eventType, clientIp, metadata) -> {};

        TenantFlowConfigRepository flowConfigRepo = new TenantFlowConfigRepository() {
            @Override
            public TenantFlowConfig findByTenantId(String tenantId) {
                if ("tenant_enterprise".equals(tenantId)) {
                    return new DefaultTenantFlowConfig(
                            "tenant_enterprise",
                            List.of("GEO_IP_BLOCK", "RATE_LIMIT"),
                            List.of("JWT_CLAIM_ENRICHER", "AUDIT_LOG"),
                            Map.of()
                    );
                } else {
                    return new DefaultTenantFlowConfig(
                            "tenant_b2c",
                            List.of("RATE_LIMIT"),
                            List.of("JWT_CLAIM_ENRICHER"),
                            Map.of()
                    );
                }
            }
            @Override public void save(TenantFlowConfig flowConfig) {}
        };

        List<PreAuthHook> preHooks = List.of(
                new BotDetectionHook(),
                new GeoIPBlockHook(ipRepo),
                new RateLimitHook(rateRepo)
        );

        List<PostAuthHook> postHooks = List.of(
                new JWTClaimEnricherHook(),
                new AuditLogHook(auditRepo),
                new TenantWebhookHook()
        );

        pipelineEngine = new DefaultAuthHookPipelineEngine(flowConfigRepo, preHooks, postHooks);
    }

    @Test
    @DisplayName("Chunk 2: Pre-Auth Hook Pipeline - Enterprise Tenant Blocks Blacklisted IP")
    void testPreAuthHookEnterpriseTenant() {
        AuthContext enterpriseContext = new DefaultAuthContext("s1", "tenant_enterprise", "usr_1", "10.0.0.99", "Browser", "step1", Map.of());

        PreAuthHook.PreAuthResult result = pipelineEngine.executePreAuthPipeline(enterpriseContext, Map.of());

        assertFalse(result.allowed(), "Enterprise tenant must block blacklisted IP");
        assertTrue(result.blockReason().contains("blacklisted"));
    }

    @Test
    @DisplayName("Chunk 2: Pre-Auth Hook Pipeline - B2C Tenant Allows Same IP")
    void testPreAuthHookB2CTenant() {
        AuthContext b2cContext = new DefaultAuthContext("s2", "tenant_b2c", "usr_2", "10.0.0.99", "Browser", "step1", Map.of());

        PreAuthHook.PreAuthResult result = pipelineEngine.executePreAuthPipeline(b2cContext, Map.of());

        assertTrue(result.allowed(), "B2C tenant allows IP because GEO_IP_BLOCK hook is not enabled");
    }

    @Test
    @DisplayName("Chunk 2: Post-Auth Hook Pipeline - Enrich JWT Claims")
    void testPostAuthHookPipeline() {
        AuthContext context = new DefaultAuthContext("s3", "tenant_enterprise", "usr_admin", "127.0.0.1", "Browser", "step1", Map.of());

        Map<String, Object> claims = pipelineEngine.executePostAuthPipeline(context, Map.of("email", "admin@enterprise.com"));

        assertNotNull(claims);
        assertEquals("tenant_enterprise", claims.get("tenant_id"));
        assertEquals("usr_admin", claims.get("user_id"));
        assertEquals("https://auth.tenant_enterprise.enterprise.com", claims.get("iss"));
    }
}
