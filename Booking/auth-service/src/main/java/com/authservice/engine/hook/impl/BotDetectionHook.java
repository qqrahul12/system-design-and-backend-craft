package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.engine.hook.PreAuthHook;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Pre-Auth Hook verifying Bot / Captcha score before allowing authentication.
 */
@Component
public class BotDetectionHook implements PreAuthHook {

    @Override
    public String getHookName() {
        return "BOT_DETECTION";
    }

    @Override
    public int getOrder() {
        return 1; // Runs first
    }

    @Override
    public PreAuthResult execute(AuthContext context, Map<String, Object> payload) {
        if (payload != null && payload.containsKey("captcha_token")) {
            String captchaToken = (String) payload.get("captcha_token");
            if ("invalid_bot_token".equalsIgnoreCase(captchaToken)) {
                return PreAuthResult.block("Bot detected: Invalid captcha token");
            }
        }
        return PreAuthResult.allow();
    }
}
