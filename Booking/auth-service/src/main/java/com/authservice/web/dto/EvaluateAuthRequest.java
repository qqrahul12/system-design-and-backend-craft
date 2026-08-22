package com.authservice.web.dto;

import com.authservice.domain.AuthContext;
import com.authservice.domain.impl.DefaultAuthContext;

import java.util.HashMap;
import java.util.Map;

public record EvaluateAuthRequest(
        String sessionId,
        String loginContext,
        String method,
        String identifier,
        String password,
        String otpCode,
        String phone,
        String credentialId,
        String signature,
        String deviceId,
        Boolean mustChangePassword
) {
    public AuthContext toAuthContext(String tenantId, String clientIp, String userAgent) {
        Map<String, Object> metadata = new HashMap<>();
        if (Boolean.TRUE.equals(mustChangePassword)) {
            metadata.put("must_change_password", true);
        }
        if (deviceId != null) {
            metadata.put("device_id", deviceId);
        }

        String userId = identifier != null ? identifier : "usr_default";
        return new DefaultAuthContext(sessionId, tenantId, userId, clientIp, userAgent, "step_evaluate", metadata);
    }

    public Map<String, Object> toPayloadMap() {
        Map<String, Object> payload = new HashMap<>();
        if (method != null) payload.put("method", method);
        if (password != null) payload.put("password", password);
        if (otpCode != null) payload.put("otp_code", otpCode);
        if (phone != null) payload.put("phone", phone);
        if (credentialId != null) payload.put("credential_id", credentialId);
        if (signature != null) payload.put("signature", signature);
        if (deviceId != null) payload.put("device_id", deviceId);
        return payload;
    }
}
