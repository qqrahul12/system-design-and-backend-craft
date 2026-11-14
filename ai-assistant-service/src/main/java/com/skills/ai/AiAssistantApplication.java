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
        SpringApplication.run(AiAssistantApplication.class, args);
    }
}
