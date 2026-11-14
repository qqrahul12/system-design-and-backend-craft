package com.skills.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the AI Assistant Service.
 *
 * <p>Spring Boot Application scanning both CineMind AI core services (com.skills.ai)
 * and payment-service's Resilience4j circuit breaker clients (com.payment).</p>
 */
@SpringBootApplication(scanBasePackages = {"com.skills.ai", "com.payment"})
public class AiAssistantApplication {

    public static void main(String[] args) {
        sanitizeEnvironment();
        SpringApplication.run(AiAssistantApplication.class, args);
    }

    private static void sanitizeEnvironment() {
        String rawDsUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (rawDsUrl == null) {
            rawDsUrl = System.getProperty("spring.datasource.url");
        }
        if (rawDsUrl != null && (rawDsUrl.contains("\n") || rawDsUrl.contains("\r") || rawDsUrl.startsWith("\"") || rawDsUrl.startsWith("'"))) {
            String[] lines = rawDsUrl.split("\\r?\\n");
            String cleanUrl = stripQuotes(lines[0].trim());
            System.setProperty("spring.datasource.url", cleanUrl);
            System.setProperty("SPRING_DATASOURCE_URL", cleanUrl);

            for (int i = 1; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.startsWith("SPRING_DATASOURCE_USERNAME=")) {
                    String user = stripQuotes(line.substring("SPRING_DATASOURCE_USERNAME=".length()).trim());
                    System.setProperty("spring.datasource.username", user);
                    System.setProperty("SPRING_DATASOURCE_USERNAME", user);
                } else if (line.startsWith("SPRING_DATASOURCE_PASSWORD=")) {
                    String pass = stripQuotes(line.substring("SPRING_DATASOURCE_PASSWORD=".length()).trim());
                    System.setProperty("spring.datasource.password", pass);
                    System.setProperty("SPRING_DATASOURCE_PASSWORD", pass);
                }
            }
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
