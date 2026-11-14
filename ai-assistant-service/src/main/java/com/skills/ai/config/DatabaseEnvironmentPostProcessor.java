package com.skills.ai.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * EnvironmentPostProcessor that automatically sanitizes database configuration parameters.
 *
 * <p>Protects against accidental multi-line environment variables pasted into deployment
 * consoles (e.g. Render, Railway, Kubernetes) where newline characters leak into
 * {@code SPRING_DATASOURCE_URL} causing {@code PSQLException: Invalid sslmode value}.</p>
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String rawDsUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        if (rawDsUrl == null) {
            rawDsUrl = environment.getProperty("spring.datasource.url");
        }

        if (rawDsUrl != null && (rawDsUrl.contains("\n") || rawDsUrl.contains("\r") || rawDsUrl.startsWith("\"") || rawDsUrl.startsWith("'"))) {
            Map<String, Object> overrides = new HashMap<>();
            String[] lines = rawDsUrl.split("\\r?\\n");
            String cleanUrl = stripQuotes(lines[0].trim());
            overrides.put("spring.datasource.url", cleanUrl);

            for (int i = 1; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.startsWith("SPRING_DATASOURCE_USERNAME=")) {
                    overrides.put("spring.datasource.username", stripQuotes(line.substring("SPRING_DATASOURCE_USERNAME=".length()).trim()));
                } else if (line.startsWith("SPRING_DATASOURCE_PASSWORD=")) {
                    overrides.put("spring.datasource.password", stripQuotes(line.substring("SPRING_DATASOURCE_PASSWORD=".length()).trim()));
                }
            }

            environment.getPropertySources().addFirst(new MapPropertySource("sanitizedDatabaseProperties", overrides));
        }
    }

    private static String stripQuotes(String s) {
        if (s == null) return null;
        s = s.trim();
        if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
            return s.substring(1, s.length() - 1).trim();
        }
        return s;
    }
}
