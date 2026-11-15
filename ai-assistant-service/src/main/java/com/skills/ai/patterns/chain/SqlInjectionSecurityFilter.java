package com.skills.ai.patterns.chain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Chain of Responsibility Concrete Handler:
 * Inspects prompt for SQL injection and database enumeration keywords.
 */
@Slf4j
@Component
public class SqlInjectionSecurityFilter extends PromptSecurityFilter {

    private static final List<String> SQL_PATTERNS = List.of(
            "drop table",
            "drop database",
            "dump database",
            "select * from",
            "union select",
            "exec xp_",
            "-- and 1=1"
    );

    @Override
    public FilterResult process(String prompt) {
        if (prompt == null) return checkNext("");
        String lower = prompt.toLowerCase();
        for (String pattern : SQL_PATTERNS) {
            if (lower.contains(pattern)) {
                log.warn("[Chain:SqlFilter] Unauthorized SQL probing blocked: '{}'", pattern);
                return FilterResult.block("SQL_INJECTION", "Database probing or SQL manipulation blocked: " + pattern);
            }
        }
        return checkNext(prompt);
    }
}
