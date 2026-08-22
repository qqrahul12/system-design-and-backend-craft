package com.authservice.web;

import com.authservice.domain.AuthContext;
import com.authservice.domain.AuthFlowResult;
import com.authservice.domain.TenantSecurityPolicy;
import com.authservice.domain.TokenPair;
import com.authservice.domain.impl.DefaultTenantSecurityPolicy;
import com.authservice.engine.flow.AuthFlowEngine;
import com.authservice.engine.token.LogoutService;
import com.authservice.engine.token.TokenService;
import com.authservice.web.dto.ApiResponse;
import com.authservice.web.dto.EvaluateAuthRequest;
import com.authservice.web.dto.LogoutRequest;
import com.authservice.web.dto.RefreshTokenRequest;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller for multi-tenant Auth Engine endpoints.
 */
@RestController
@RequestMapping("/v1/auth")
public class AuthController {

    private final AuthFlowEngine authFlowEngine;
    private final TokenService tokenService;
    private final LogoutService logoutService;

    public AuthController(AuthFlowEngine authFlowEngine, TokenService tokenService, LogoutService logoutService) {
        this.authFlowEngine = authFlowEngine;
        this.tokenService = tokenService;
        this.logoutService = logoutService;
    }

    /**
     * POST /v1/auth/evaluate
     * Evaluates incoming credential/challenge payloads against active tenant flow state machine.
     */
    @PostMapping("/evaluate")
    public ApiResponse<AuthFlowResult> evaluateAuth(@RequestBody EvaluateAuthRequest request, HttpServletRequest httpRequest) {
        String tenantId = TenantContext.getTenantId();
        String clientIp = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        AuthContext context = request.toAuthContext(tenantId, clientIp, userAgent);
        Map<String, Object> payload = request.toPayloadMap();

        AuthFlowResult result = authFlowEngine.advanceFlow(context, payload);
        return ApiResponse.ok(result.getStatus(), result);
    }

    /**
     * POST /v1/auth/token/refresh
     * Rotates refresh tokens and issues new access token pair.
     */
    @PostMapping("/token/refresh")
    public ApiResponse<TokenPair> refreshTokens(@RequestBody RefreshTokenRequest request) {
        String tenantId = TenantContext.getTenantId();
        TenantSecurityPolicy policy = new DefaultTenantSecurityPolicy(tenantId, true, true, null, 3600L, 86400L, 5);

        TokenPair tokenPair = tokenService.refreshTokens(tenantId, request.refreshToken(), policy);
        return ApiResponse.ok("SUCCESS", tokenPair);
    }

    /**
     * POST /v1/auth/logout
     * Handles single-device or global logout requests.
     */
    @PostMapping("/logout")
    public ApiResponse<String> logout(@RequestBody LogoutRequest request) {
        String tenantId = TenantContext.getTenantId();

        if (Boolean.TRUE.equals(request.globalLogout())) {
            logoutService.logoutAllDevices(tenantId, "usr_default");
            return ApiResponse.ok("SUCCESS", "All device sessions revoked globally");
        } else {
            logoutService.logoutSingleDevice(tenantId, request.refreshToken(), request.accessTokenJti(), 3600L);
            return ApiResponse.ok("SUCCESS", "Single device session revoked");
        }
    }

    /**
     * GET /v1/auth/.well-known/jwks.json
     * Exposes public JSON Web Key Set for tenant token verification.
     */
    @GetMapping("/.well-known/jwks.json")
    public Map<String, Object> getJwks() {
        String tenantId = TenantContext.getTenantId();
        return tokenService.getJwksKeys(tenantId);
    }
}
