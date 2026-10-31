package com.skills.ai.llmops;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Enterprise Prompt Injection & Jailbreak Defense Guard.
 *
 * <p>Scans incoming user inputs for adversarial attack patterns:
 * <ul>
 *   <li>System prompt overrides ("ignore previous instructions", "forget rules").</li>
 *   <li>Roleplay hijacking ("you are now DAN / evil bot").</li>
 *   <li>Exfiltration attempts ("repeat system instructions verbatim").</li>
 * </ul>
 * </p>
 */
@Slf4j
@Service
public class PromptGuardService {

    private static final List<Pattern> INJECTION_PATTERNS = List.of(
            Pattern.compile("(?i)ignore (all )?(previous|prior) (instructions|prompts|directions)"),
            Pattern.compile("(?i)disregard (all )?(previous|prior) (instructions|prompts)"),
            Pattern.compile("(?i)you are now (an unrestricted|a liberated|DAN|jailbroken)"),
            Pattern.compile("(?i)(print|output|display|show|reveal) (your|the) (system prompt|instructions) verbatim"),
            Pattern.compile("(?i)forget (who you are|your rules|all prior constraints)")
    );

    public record GuardResult(boolean isSafe, String reason) {}

    /**
     * Inspects a user message for prompt injection patterns.
     */
    public GuardResult inspect(String message) {
        if (message == null || message.isBlank()) {
            return new GuardResult(true, "OK");
        }

        for (Pattern p : INJECTION_PATTERNS) {
            if (p.matcher(message).find()) {
                log.warn("🚨 [PROMPT INJECTION DETECTED] Blocked pattern: {}", p.pattern());
                return new GuardResult(false, "PROMPT_INJECTION_DETECTED: Malicious instruction override detected.");
            }
        }

        return new GuardResult(true, "OK");
    }
}
