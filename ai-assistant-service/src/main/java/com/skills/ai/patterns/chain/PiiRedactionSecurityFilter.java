package com.skills.ai.patterns.chain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Chain of Responsibility Concrete Handler:
 * Sanitizes and redacts Personally Identifiable Information (PII) such as credit cards.
 */
@Slf4j
@Component
public class PiiRedactionSecurityFilter extends PromptSecurityFilter {

    private static final Pattern CARD_PATTERN = Pattern.compile("\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b");

    @Override
    public FilterResult process(String prompt) {
        if (prompt == null) return checkNext("");
        var matcher = CARD_PATTERN.matcher(prompt);
        if (matcher.find()) {
            String redacted = matcher.replaceAll("[REDACTED_CARD_NUMBER]");
            log.info("[Chain:PiiFilter] Redacted sensitive card number from prompt");
            return checkNext(redacted);
        }
        return checkNext(prompt);
    }
}
