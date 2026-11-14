package com.skills.ai.patterns.chain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Chain of Responsibility Concrete Handler:
 * Inspects prompt for adversarial jailbreak, roleplay spoofing, and system override attempts.
 */
@Slf4j
@Component
public class JailbreakSecurityFilter extends PromptSecurityFilter {

    private static final List<String> JAILBREAK_PATTERNS = List.of(
            "ignore previous instructions",
            "ignore all previous",
            "system override",
            "disregard guidelines",
            "you are now dan",
            "act as an unfiltered"
    );

    @Override
    public FilterResult process(String prompt) {
        if (prompt == null) return checkNext("");
        String lower = prompt.toLowerCase();
        for (String pattern : JAILBREAK_PATTERNS) {
            if (lower.contains(pattern)) {
                log.warn("🛡️ [Chain:JailbreakFilter] Adversarial prompt blocked: '{}'", pattern);
                return FilterResult.block("JAILBREAK_ATTEMPT", "Adversarial system override detected matching pattern: " + pattern);
            }
        }
        return checkNext(prompt);
    }
}
