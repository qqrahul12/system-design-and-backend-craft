package com.skills.ai.patterns.chain;

/**
 * Chain of Responsibility Pattern: Handler Interface
 * Allows multiple security filters, guardrails, and compliance checks
 * to process an incoming user prompt in sequence without tight coupling.
 */
public abstract class PromptSecurityFilter {

    private PromptSecurityFilter next;

    public PromptSecurityFilter linkWith(PromptSecurityFilter next) {
        this.next = next;
        return next;
    }

    public abstract FilterResult process(String prompt);

    protected FilterResult checkNext(String prompt) {
        if (next == null) {
            return FilterResult.allow(prompt);
        }
        return next.process(prompt);
    }

    public record FilterResult(
            boolean allowed,
            String sanitizedPrompt,
            String violationCategory,
            String reason
    ) {
        public static FilterResult allow(String sanitized) {
            return new FilterResult(true, sanitized, null, "Prompt passed security filters");
        }

        public static FilterResult block(String category, String reason) {
            return new FilterResult(false, null, category, reason);
        }
    }
}
