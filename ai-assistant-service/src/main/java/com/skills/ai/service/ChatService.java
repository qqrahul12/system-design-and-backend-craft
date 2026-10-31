package com.skills.ai.service;

import com.skills.ai.llmops.LlmOpsCacheManager;
import com.skills.ai.llmops.PromptGuardService;
import com.skills.ai.model.ChatRequest;
import com.skills.ai.model.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.UUID;

/**
 * Multi-Model Core Chat & Routing Service with LLMOps Caching & Prompt Guard.
 */
@Slf4j
@Service
public class ChatService {

    private final ChatClient geminiChatClient;
    private final ChatClient groqChatClient;
    private final PromptGuardService promptGuardService;
    private final LlmOpsCacheManager cacheManager = LlmOpsCacheManager.getInstance();

    private static final String GEMINI_MODEL = "gemini-3.8-flash";
    private static final String GROQ_MODEL = "qwen/qwen3.8-27b (Groq LPU)";

    private static final String SYSTEM_PROMPT = """
            You are CineMind AI, a helpful assistant for an AI-powered movie booking platform.
            You help users discover movies, answer questions about shows, assist with bookings,
            and provide personalized recommendations. Be concise, friendly, and accurate.
            When you don't know something, say so rather than making things up.
            """;

    public ChatService(@Qualifier("geminiChatClient") ChatClient geminiChatClient,
                       @Qualifier("groqChatClient") ChatClient groqChatClient,
                       PromptGuardService promptGuardService) {
        this.geminiChatClient = geminiChatClient;
        this.groqChatClient = groqChatClient;
        this.promptGuardService = promptGuardService;
    }

    /**
     * Blocking chat with Prompt Guard and Response Caching.
     */
    public ChatResponse chat(ChatRequest request, String provider) {
        long start = System.currentTimeMillis();

        // 1. LLMOps Security Pre-Check: Prompt Injection Defense
        PromptGuardService.GuardResult guardCheck = promptGuardService.inspect(request.message());
        if (!guardCheck.isSafe()) {
            return new ChatResponse(
                    "🛡️ [SECURITY ALERT] Your input was blocked by CineMind Prompt Guard. Reason: " + guardCheck.reason(),
                    "prompt-guard-v2",
                    request.conversationId() != null ? request.conversationId() : UUID.randomUUID().toString(),
                    System.currentTimeMillis() - start,
                    false,
                    Instant.now()
            );
        }

        boolean useGroq = "groq".equalsIgnoreCase(provider);
        ChatClient activeClient = useGroq ? groqChatClient : geminiChatClient;
        String modelName = useGroq ? GROQ_MODEL : GEMINI_MODEL;
        String providerKey = useGroq ? "groq" : "gemini";

        // 2. LLMOps Cost Optimization: Check Memoized Response Cache
        String cacheKey = cacheManager.generateKey(providerKey, request.message());
        LlmOpsCacheManager.CachedEntry cached = cacheManager.get(cacheKey);

        if (cached != null) {
            log.info("⚡ [CACHE HIT] Returning memoized response for key: {}", cacheKey);
            return new ChatResponse(
                    cached.getResponse(),
                    cached.getModel() + " (Cached)",
                    request.conversationId() != null ? request.conversationId() : UUID.randomUUID().toString(),
                    System.currentTimeMillis() - start,
                    true,
                    Instant.now()
            );
        }

        // 3. Cache Miss — Call LLM Provider
        log.info("Processing blocking chat via provider={} (model={}): conversationId={}",
                provider, modelName, request.conversationId());

        String content = activeClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(request.message())
                .call()
                .content();

        long elapsed = System.currentTimeMillis() - start;
        log.info("Chat completed via {} in {}ms", modelName, elapsed);

        // 4. Save to Cache (TTL 1 hour)
        cacheManager.put(cacheKey, content, modelName, elapsed, 3600);

        String conversationId = request.conversationId() != null
                ? request.conversationId()
                : UUID.randomUUID().toString();

        return new ChatResponse(
                content,
                modelName,
                conversationId,
                elapsed,
                false,
                Instant.now()
        );
    }

    public ChatResponse chat(ChatRequest request) {
        return chat(request, "gemini");
    }

    /**
     * Streaming chat with Prompt Guard verification.
     */
    public Flux<String> streamChat(String message, String provider) {
        PromptGuardService.GuardResult guardCheck = promptGuardService.inspect(message);
        if (!guardCheck.isSafe()) {
            return Flux.just("🛡️ [SECURITY ALERT] Your input was blocked by CineMind Prompt Guard. Reason: " + guardCheck.reason());
        }

        boolean useGroq = "groq".equalsIgnoreCase(provider);
        ChatClient activeClient = useGroq ? groqChatClient : geminiChatClient;
        String modelName = useGroq ? GROQ_MODEL : GEMINI_MODEL;

        log.info("Starting streaming chat via provider={} ({})", provider, modelName);
        return activeClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(message)
                .stream()
                .content();
    }

    public Flux<String> streamChat(String message) {
        return streamChat(message, "gemini");
    }
}
