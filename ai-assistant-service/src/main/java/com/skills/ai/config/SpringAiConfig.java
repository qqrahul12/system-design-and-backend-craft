package com.skills.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Multi-Provider Spring AI Configuration.
 *
 * <p>Wires dual LLM backends:
 * <ul>
 *   <li><b>Gemini</b> (Google AI Studio) — Primary orchestrator, complex reasoning, RAG context synthesis.</li>
 *   <li><b>Groq LPU</b> — High-speed worker agent, ultra-low latency tool executions, prompt guard.</li>
 * </ul>
 * Both connect via OpenAI-compatible endpoints seamlessly supported by Spring AI.</p>
 */
@Configuration
public class SpringAiConfig {

    @Value("${ai.gemini.api-key}")
    private String geminiApiKey;

    @Value("${ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta/openai}")
    private String geminiBaseUrl;

    @Value("${ai.gemini.model:gemini-3.8-flash}")
    private String geminiModel;

    @Value("${ai.gemini.temperature:0.7}")
    private Double geminiTemperature;

    @Value("${ai.groq.api-key}")
    private String groqApiKey;

    @Value("${ai.groq.base-url:https://api.groq.com/openai}")
    private String groqBaseUrl;

    @Value("${ai.groq.model:qwen/qwen3.8-27b}")
    private String groqModel;

    @Value("${ai.groq.temperature:0.2}")
    private Double groqTemperature;

    // -------------------------------------------------------------
    // Gemini: Orchestrator Model & ChatClient
    // -------------------------------------------------------------
    @Bean(name = "geminiChatModel")
    @Primary
    public OpenAiChatModel geminiChatModel() {
        OpenAiApi openAiApi = OpenAiApi.builder()
                .apiKey(geminiApiKey)
                .baseUrl(geminiBaseUrl)
                .build();

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(geminiModel)
                .temperature(geminiTemperature)
                .build();

        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
    }

    @Bean(name = "geminiChatClient")
    @Primary
    public ChatClient geminiChatClient(@Qualifier("geminiChatModel") OpenAiChatModel geminiChatModel) {
        return ChatClient.builder(geminiChatModel).build();
    }

    // -------------------------------------------------------------
    // Groq: Fast Execution Worker Model & ChatClient
    // -------------------------------------------------------------
    @Bean(name = "groqChatModel")
    public OpenAiChatModel groqChatModel() {
        OpenAiApi openAiApi = OpenAiApi.builder()
                .apiKey(groqApiKey)
                .baseUrl(groqBaseUrl)
                .build();

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(groqModel)
                .temperature(groqTemperature)
                .build();

        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
    }

    @Bean(name = "groqChatClient")
    public ChatClient groqChatClient(@Qualifier("groqChatModel") OpenAiChatModel groqChatModel) {
        return ChatClient.builder(groqChatModel).build();
    }
}
