package com.authservice.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.authservice.domain.*;
import com.authservice.domain.impl.DefaultTenantFlowConfig;
import com.authservice.domain.impl.DefaultUserCredential;
import com.authservice.repository.*;
import com.authservice.web.dto.EvaluateAuthRequest;
import com.authservice.web.dto.LogoutRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = {DataSourceAutoConfiguration.class, RedisAutoConfiguration.class, RedisRepositoriesAutoConfiguration.class})
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserCredentialsRepository userCredentialsRepository;

    @MockBean
    private IpBlacklistRepository ipBlacklistRepository;

    @MockBean
    private RateLimitRepository rateLimitRepository;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @MockBean
    private TenantFlowConfigRepository tenantFlowConfigRepository;

    @MockBean
    private AuthSessionRepository authSessionRepository;

    @MockBean
    private AuthFlowGraphRepository authFlowGraphRepository;

    @MockBean
    private RefreshTokenRepository refreshTokenRepository;

    @MockBean
    private JwtBlacklistRepository jwtBlacklistRepository;

    @Test
    @DisplayName("Chunk 6 Integration Test: Complete End-to-End Multi-Tenant Auth Lifecycle")
    void testEndToEndAuthLifecycle() throws Exception {
        given(userCredentialsRepository.findByUserId(anyString()))
                .willReturn(new DefaultUserCredential("c1", "usr_9918", "tenant_acme", "PASSWORD", "hash_Secret123!"));

        given(tenantFlowConfigRepository.findByTenantId(anyString()))
                .willReturn(new DefaultTenantFlowConfig("tenant_acme", List.of("RATE_LIMIT"), List.of("JWT_CLAIM_ENRICHER"), Map.of()));

        // 1. POST /v1/auth/evaluate - Password Primary Auth
        EvaluateAuthRequest evaluateReq = new EvaluateAuthRequest(
                null, null, "PASSWORD", "usr_9918", "Secret123!",
                null, null, null, null, "dev_macbook", false
        );

        mockMvc.perform(post("/v1/auth/evaluate")
                        .header("X-Tenant-Id", "tenant_acme")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(evaluateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.refreshToken").exists());

        // 2. GET /v1/auth/.well-known/jwks.json - JWKS Distribution
        mockMvc.perform(get("/v1/auth/.well-known/jwks.json")
                        .header("X-Tenant-Id", "tenant_acme"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keys").isArray());

        // 3. POST /v1/auth/logout - Single Device Logout
        LogoutRequest logoutReq = new LogoutRequest("rt_sample_token", "jti_sample", false);

        mockMvc.perform(post("/v1/auth/logout")
                        .header("X-Tenant-Id", "tenant_acme")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Single device session revoked"));
    }
}
