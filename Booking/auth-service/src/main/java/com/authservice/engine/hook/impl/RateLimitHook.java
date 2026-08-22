package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.engine.hook.PreAuthHook;
import com.authservice.repository.RateLimitRepository;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Pre-Auth Hook enforcing failed login rate limits per tenant and IP via RateLimitRepository.
 */
@Component
public class RateLimitHook implements PreAuthHook {

    private final RateLimitRepository rateLimitRepository;
    private static final int DEFAULT_MAX_ATTEMPTS = 5;

    public RateLimitHook(RateLimitRepository rateLimitRepository) {
        this.rateLimitRepository = rateLimitRepository;
    }

    @Override
    public String getHookName() {
        return "RATE_LIMIT";
    }

    @Override
    public int getOrder() {
        return 3;
    }

    @Override
    public PreAuthResult execute(AuthContext context, Map<String, Object> payload) {
        if (context == null || context.getClientIp() == null) {
            return PreAuthResult.allow();
        }

        boolean limited = rateLimitRepository.isRateLimited(context.getTenantId(), context.getClientIp(), DEFAULT_MAX_ATTEMPTS);
        if (limited) {
            return PreAuthResult.block("Rate limit exceeded: Too many failed login attempts for this IP");
        }

        return PreAuthResult.allow();
    }
}
