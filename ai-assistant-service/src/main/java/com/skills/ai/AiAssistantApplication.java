package com.skills.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the AI Assistant Service.
 *
 * <p>Week 1 scope: Gemini LLM integration via Spring AI (OpenAI-compatible endpoint),
 * blocking chat and SSE streaming endpoints, CORS for Next.js frontend.</p>
 */
@SpringBootApplication
public class AiAssistantApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiAssistantApplication.class, args);
    }
}
