package com.authservice.engine.hook.impl;

import com.authservice.domain.AuthContext;
import com.authservice.domain.TenantFlowConfig;
import com.authservice.engine.hook.AuthHookPipelineEngine;
import com.authservice.engine.hook.PostAuthHook;
import com.authservice.engine.hook.PreAuthHook;
import com.authservice.repository.TenantFlowConfigRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service implementation of AuthHookPipelineEngine.
 * Dynamically queries tenant flow configuration and executes only tenant-enabled hooks.
 */
@Service
public class DefaultAuthHookPipelineEngine implements AuthHookPipelineEngine {

    private final TenantFlowConfigRepository flowConfigRepository;
    private final Map<String, PreAuthHook> preAuthHookMap;
    private final Map<String, PostAuthHook> postAuthHookMap;

    public DefaultAuthHookPipelineEngine(TenantFlowConfigRepository flowConfigRepository,
                                          List<PreAuthHook> preAuthHooks,
                                          List<PostAuthHook> postAuthHooks) {
        this.flowConfigRepository = flowConfigRepository;
        this.preAuthHookMap = preAuthHooks.stream()
                .collect(Collectors.toMap(h -> h.getHookName().toUpperCase(), h -> h));
        this.postAuthHookMap = postAuthHooks.stream()
                .collect(Collectors.toMap(h -> h.getHookName().toUpperCase(), h -> h));
    }

    @Override
    public PreAuthHook.PreAuthResult executePreAuthPipeline(AuthContext context, Map<String, Object> payload) {
        if (context == null) {
            return PreAuthHook.PreAuthResult.allow();
        }

        // Query Tenant's Flow Config
        TenantFlowConfig flowConfig = flowConfigRepository.findByTenantId(context.getTenantId());
        if (flowConfig == null || flowConfig.getEnabledPreAuthHookNames().isEmpty()) {
            return PreAuthHook.PreAuthResult.allow();
        }

        // Filter and sort tenant-enabled Pre-Auth hooks
        List<PreAuthHook> activeHooks = flowConfig.getEnabledPreAuthHookNames().stream()
                .map(name -> preAuthHookMap.get(name.toUpperCase()))
                .filter(hook -> hook != null)
                .sorted(Comparator.comparingInt(PreAuthHook::getOrder))
                .toList();

        for (PreAuthHook hook : activeHooks) {
            PreAuthHook.PreAuthResult result = hook.execute(context, payload);
            if (!result.allowed()) {
                return result; // Abort pre-auth pipeline immediately on block
            }
        }

        return PreAuthHook.PreAuthResult.allow();
    }

    @Override
    public Map<String, Object> executePostAuthPipeline(AuthContext context, Map<String, Object> initialClaims) {
        if (context == null) {
            return initialClaims != null ? initialClaims : Map.of();
        }

        TenantFlowConfig flowConfig = flowConfigRepository.findByTenantId(context.getTenantId());
        if (flowConfig == null || flowConfig.getEnabledPostAuthHookNames().isEmpty()) {
            return initialClaims != null ? initialClaims : Map.of();
        }

        List<PostAuthHook> activeHooks = flowConfig.getEnabledPostAuthHookNames().stream()
                .map(name -> postAuthHookMap.get(name.toUpperCase()))
                .filter(hook -> hook != null)
                .sorted(Comparator.comparingInt(PostAuthHook::getOrder))
                .toList();

        Map<String, Object> currentClaims = initialClaims != null ? initialClaims : Map.of();

        for (PostAuthHook hook : activeHooks) {
            currentClaims = hook.execute(context, currentClaims);
        }

        return currentClaims;
    }
}
