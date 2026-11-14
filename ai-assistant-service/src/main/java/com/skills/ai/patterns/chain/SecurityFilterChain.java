package com.skills.ai.patterns.chain;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Chain of Responsibility Pattern Coordinator:
 * Dynamically links the filter chain and exposes single evaluate() entry point.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityFilterChain {

    private final JailbreakSecurityFilter jailbreakFilter;
    private final SqlInjectionSecurityFilter sqlFilter;
    private final PiiRedactionSecurityFilter piiFilter;

    private PromptSecurityFilter headFilter;

    @PostConstruct
    public void buildChain() {
        // Link: Jailbreak -> SQL Injection -> PII Redaction
        jailbreakFilter.linkWith(sqlFilter).linkWith(piiFilter);
        this.headFilter = jailbreakFilter;
        log.info("⛓️ [SecurityFilterChain] Successfully assembled 3-stage Chain of Responsibility for prompt protection");
    }

    public PromptSecurityFilter.FilterResult evaluate(String prompt) {
        if (headFilter == null) {
            buildChain();
        }
        return headFilter.process(prompt);
    }
}
