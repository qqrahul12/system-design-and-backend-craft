package com.authservice.engine.hook;

import com.authservice.domain.AuthContext;
import java.util.Map;

/**
 * Strategy Interface for Pre-Authentication Action Hooks.
 * Executed BEFORE credential verification (e.g. Bot Detection, Geo-IP Blocking, Rate Limiting).
 */
public interface PreAuthHook {

    String getHookName();

    int getOrder();

    /**
     * Executes pre-auth check.
     *
     * @param context Authentication thread context.
     * @param payload Incoming request payload.
     * @return PreAuthResult containing allowed status and failure reason.
     */
    PreAuthResult execute(AuthContext context, Map<String, Object> payload);

    record PreAuthResult(boolean allowed, String blockReason, Map<String, Object> metadata) {
        public static PreAuthResult allow() {
            return new PreAuthResult(true, null, Map.of());
        }

        public static PreAuthResult block(String reason) {
            return new PreAuthResult(false, reason, Map.of());
        }
    }
}
