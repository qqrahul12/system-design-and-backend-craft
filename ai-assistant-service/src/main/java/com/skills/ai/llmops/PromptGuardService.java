package com.skills.ai.llmops;

import com.skills.ai.patterns.chain.PromptSecurityFilter;
import com.skills.ai.patterns.chain.SecurityFilterChain;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Enterprise Prompt Injection & Jailbreak Defense Guard.
 * Uses the Chain of Responsibility Pattern (SecurityFilterChain) to evaluate incoming user inputs.
 */
@Slf4j
@Service
public class PromptGuardService {

    private final SecurityFilterChain securityFilterChain;

    @Autowired
    public PromptGuardService(@Autowired(required = false) SecurityFilterChain securityFilterChain) {
        this.securityFilterChain = securityFilterChain;
    }

    private static final List<Pattern> INJECTION_PATTERNS = List.of(
            Pattern.compile("(?i)ignore (all )?(previous|prior) (instructions|prompts|directions)"),
            Pattern.compile("(?i)disregard (all )?(previous|prior) (instructions|prompts)"),
            Pattern.compile("(?i)you are now (an unrestricted|a liberated|DAN|jailbroken)"),
            Pattern.compile("(?i)(print|output|display|show|reveal) (your|the) (system prompt|instructions) verbatim"),
            Pattern.compile("(?i)forget (who you are|your rules|all prior constraints)")
    );

    public record GuardResult(boolean isSafe, String reason) {}

    /**
     * Inspects a user message for prompt injection patterns using Chain of Responsibility.
     */
    public GuardResult inspect(String message) {
        if (message == null || message.isBlank()) {
            return new GuardResult(true, "OK");
        }

        // 1. Evaluate via Chain of Responsibility pattern
        if (securityFilterChain != null) {
            PromptSecurityFilter.FilterResult chainResult = securityFilterChain.evaluate(message);
            if (!chainResult.allowed()) {
                log.warn("[CHAIN OF RESPONSIBILITY BLOCKED] Category: {}, Reason: {}",
                        chainResult.violationCategory(), chainResult.reason());
                return new GuardResult(false, "PROMPT_INJECTION_DETECTED: " + chainResult.reason());
            }
        }

        // 2. Direct regex inspection backup
        for (Pattern p : INJECTION_PATTERNS) {
            if (p.matcher(message).find()) {
                log.warn("[PROMPT INJECTION DETECTED] Blocked pattern: {}", p.pattern());
                return new GuardResult(false, "PROMPT_INJECTION_DETECTED: Malicious instruction override detected.");
            }
        }

        return new GuardResult(true, "OK");
    }
}
