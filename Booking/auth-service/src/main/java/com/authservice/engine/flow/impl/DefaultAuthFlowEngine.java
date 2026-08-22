package com.authservice.engine.flow.impl;

import com.authservice.domain.*;
import com.authservice.domain.impl.DefaultAuthFlowResult;
import com.authservice.domain.impl.DefaultAuthSession;
import com.authservice.engine.flow.AuthFlowEngine;
import com.authservice.engine.hook.AuthHookPipelineEngine;
import com.authservice.engine.hook.PreAuthHook;
import com.authservice.engine.provider.IdentityProvider;
import com.authservice.engine.provider.IdentityProviderRegistry;
import com.authservice.repository.AuthFlowGraphRepository;
import com.authservice.repository.AuthSessionRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service implementation of the AuthFlowEngine state machine.
 * Orchestrates Pre-Auth Hooks, IdP Credential Verification, Concurrent Session Control,
 * Dynamic Step Evaluation, and Post-Auth Hook Execution.
 */
@Service
public class DefaultAuthFlowEngine implements AuthFlowEngine {

    private final AuthHookPipelineEngine hookPipelineEngine;
    private final IdentityProviderRegistry providerRegistry;
    private final AuthFlowGraphRepository flowGraphRepository;
    private final AuthSessionRepository sessionRepository;

    public DefaultAuthFlowEngine(AuthHookPipelineEngine hookPipelineEngine,
                                 IdentityProviderRegistry providerRegistry,
                                 AuthFlowGraphRepository flowGraphRepository,
                                 AuthSessionRepository sessionRepository) {
        this.hookPipelineEngine = hookPipelineEngine;
        this.providerRegistry = providerRegistry;
        this.flowGraphRepository = flowGraphRepository;
        this.sessionRepository = sessionRepository;
    }

    @Override
    public AuthFlowResult advanceFlow(AuthContext context, Map<String, Object> payload) {
        if (context == null || payload == null) {
            return new DefaultAuthFlowResult("FAILED", null, null, null, null, null, "Missing context or payload");
        }

        // 1. Run Pre-Authentication Action Hooks
        PreAuthHook.PreAuthResult preAuthResult = hookPipelineEngine.executePreAuthPipeline(context, payload);
        if (!preAuthResult.allowed()) {
            return new DefaultAuthFlowResult("BLOCKED", context.getSessionId(), context.getUserId(), null, null, null, preAuthResult.blockReason());
        }

        // 2. Determine Method and Provider
        String method = (String) payload.get("method");
        if (method == null) {
            method = "PASSWORD"; // Default
        }

        IdentityProvider provider = providerRegistry.getProvider(method);
        if (provider == null) {
            return new DefaultAuthFlowResult("FAILED", context.getSessionId(), context.getUserId(), null, null, null, "Unsupported auth method: " + method);
        }

        // 3. Handle 2-Phase Challenge Initiation if required
        if (provider.isChallengeRequired() && !payload.containsKey("otp_code") && !payload.containsKey("signature")) {
            Map<String, Object> challengeMeta = provider.initiateChallenge(context, payload);
            return new DefaultAuthFlowResult("CHALLENGE_REQUIRED", context.getSessionId(), context.getUserId(), null, null, "step_verify_challenge", "Challenge initiated");
        }

        // 4. Verify Credentials (Pure SRP Credential Match)
        boolean verified = provider.verifyCredentials(context, payload);
        if (!verified) {
            return new DefaultAuthFlowResult("FAILED", context.getSessionId(), context.getUserId(), null, null, null, "Invalid credentials");
        }

        // 5. Update AuthSession Verified Factors State
        String sessionId = context.getSessionId() != null ? context.getSessionId() : "sess_" + UUID.randomUUID().toString().substring(0, 8);
        AuthSession existingSession = sessionRepository.findBySessionId(context.getTenantId(), sessionId);

        List<String> updatedFactors = new ArrayList<>(existingSession != null ? existingSession.getVerifiedFactors() : List.of());
        if (!updatedFactors.contains(method)) {
            updatedFactors.add(method);
        }

        // 6. Check Concurrent Session Policy
        int activeSessionsCount = sessionRepository.countActiveSessions(context.getTenantId(), context.getUserId());
        if (activeSessionsCount >= 1 && !payload.containsKey("authorize_new_device_otp")) {
            // Concurrent session limit reached
            return new DefaultAuthFlowResult("CHALLENGE_REQUIRED", sessionId, context.getUserId(), null, null, "step_concurrent_session_otp", "Active session detected on another device. Enter OTP to authorize.");
        }

        // 7. Check Special Conditions (e.g. MUST_CHANGE_PASSWORD)
        Boolean mustChangePassword = (Boolean) context.getMetadataAttribute("must_change_password");
        if (Boolean.TRUE.equals(mustChangePassword) && !"step_force_change_password".equals(context.getCurrentStepId())) {
            return new DefaultAuthFlowResult("FORCE_CHANGE_PASSWORD", sessionId, context.getUserId(), null, null, "step_force_change_password", "Password change required before proceeding");
        }

        // Save updated AuthSession in Redis
        long now = System.currentTimeMillis();
        AuthSession updatedSession = new DefaultAuthSession(
                sessionId, context.getTenantId(), context.getUserId(), "COMPLETED", "step_complete",
                1, updatedFactors, Map.of(), Map.of("clientIp", context.getClientIp()), Map.of(), now, now + 900000L
        );
        sessionRepository.saveSession(updatedSession, 900L);

        // 8. Execute Post-Authentication Action Hooks
        Map<String, Object> enrichedClaims = hookPipelineEngine.executePostAuthPipeline(context, Map.of("sub", context.getUserId()));

        // 9. Issue Final Tokens
        String accessToken = "jwt_access_token_" + UUID.randomUUID().toString().substring(0, 12);
        String refreshToken = "rt_" + UUID.randomUUID().toString().substring(0, 12);

        return new DefaultAuthFlowResult("SUCCESS", sessionId, context.getUserId(), accessToken, refreshToken, null, null);
    }
}
