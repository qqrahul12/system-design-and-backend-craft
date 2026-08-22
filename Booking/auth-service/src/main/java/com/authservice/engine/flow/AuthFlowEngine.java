package com.authservice.engine.flow;

import com.authservice.domain.AuthContext;
import com.authservice.domain.AuthFlowResult;

import java.util.Map;

/**
 * Interface for the AuthFlowEngine state machine orchestrating multi-step authentication flows.
 */
public interface AuthFlowEngine {

    /**
     * Advances the authentication flow state machine for the given context and incoming payload.
     *
     * @param context Current authentication thread context.
     * @param payload Incoming request payload (e.g. {"method": "PASSWORD", "password": "..."}, or {"otp_code": "881920"}).
     * @return AuthFlowResult describing completion with tokens or challenge required.
     */
    AuthFlowResult advanceFlow(AuthContext context, Map<String, Object> payload);
}
