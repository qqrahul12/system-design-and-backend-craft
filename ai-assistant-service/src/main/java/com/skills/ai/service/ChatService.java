package com.skills.ai.service;

import com.skills.ai.llmops.LlmOpsCacheManager;
import com.skills.ai.llmops.PromptGuardService;
import com.skills.ai.model.ChatRequest;
import com.skills.ai.model.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
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
    private final com.skills.ai.movie.MovieCatalogService movieCatalogService;
    private final LlmOpsCacheManager cacheManager = LlmOpsCacheManager.getInstance();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private static final String GEMINI_MODEL = "gemini-3.8-flash";
    private static final String GROQ_MODEL = "qwen/qwen3.8-27b (Groq LPU)";

    public ChatService(@Qualifier("geminiChatClient") ChatClient geminiChatClient,
                       @Qualifier("groqChatClient") ChatClient groqChatClient,
                       PromptGuardService promptGuardService,
                       com.skills.ai.movie.MovieCatalogService movieCatalogService) {
        this.geminiChatClient = geminiChatClient;
        this.groqChatClient = groqChatClient;
        this.promptGuardService = promptGuardService;
        this.movieCatalogService = movieCatalogService;
    }

    private String buildSystemPrompt() {
        StringBuilder sb = new StringBuilder();
        sb.append("You are CineMind AI, the official intelligent cinema concierge for CineMind Cinemas.\n");
        sb.append("You have direct real-time access to our cinema's current theatrical schedule, auditoriums, screen formats, and concessions.\n\n");
        sb.append("CURRENT LIVE THEATRICAL SCHEDULE & SHOWTIMES:\n");
        if (movieCatalogService != null) {
            for (com.skills.ai.movie.Movie m : movieCatalogService.getAllMovies(null, null, null)) {
                sb.append(String.format("- **%s** (%s | %s | %s) | ★ %.1f | Auditorium: %s | Showtimes: %s | Admission: $%.2f\n  Synopsis: %s\n",
                        m.getTitle(), m.getGenre(), m.getDuration(), m.getAgeRating() != null ? m.getAgeRating() : "PG-13",
                        m.getRating() != null ? m.getRating() : 4.8,
                        m.getAuditorium() != null ? m.getAuditorium() : "Screen 1",
                        m.getShowtimes() != null ? m.getShowtimes() : "7:30 PM",
                        m.getPrice() != null ? m.getPrice() : 16.0,
                        m.getSynopsis() != null ? m.getSynopsis() : ""));
            }
        }
        sb.append("\nPREMIUM AUDITORIUM FORMATS:\n");
        sb.append("- Screen 1: IMAX 70mm Auditorium (15-perf 70mm film projection & 12-channel acoustic immersion)\n");
        sb.append("- Screen 2: 70mm Large Format Dual-Laser Auditorium\n");
        sb.append("- Screen 3: Dolby Cinema with Atmos Spatial Audio & Dolby Vision Dual 4K HDR\n");
        sb.append("- Screen 4: RealD 3D & 4K Laser\n\n");
        sb.append("GOURMET CONCESSIONS HIGHLIGHTS:\n");
        sb.append("- Black Truffle & Rosemary Popcorn ($11.00), Chipotle Queso Loaded Nachos ($10.50), Dark Chocolate Sea Salt Pretzel Bites ($7.50), Nitro Vanilla Sky Cold Brew ($7.00), Wild Blackberry Craft Soda ($6.00)\n\n");
        sb.append("INSTRUCTIONS:\n");
        sb.append("1. Answer questions about what's showing in IMAX, showtimes, seats, ticket prices, and film recommendations accurately and enthusiastically based on the schedule above!\n");
        sb.append("2. When asked about IMAX tonight, explicitly mention our IMAX 70mm Auditorium 1 features (such as Interstellar or Oppenheimer) and their exact showtimes.\n");
        sb.append("3. Format responses cleanly with bold film titles, formatted lists (1., 2. or -), and short readable paragraphs.\n");
        sb.append("4. Guide patrons to '[Reserve Seats](/booking)' to pick their VIP Recliner or Prime seats in real time.");
        return sb.toString();
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
                    " [SECURITY ALERT] Your input was blocked by CineMind Prompt Guard. Reason: " + guardCheck.reason(),
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
            log.info("[CACHE HIT] Returning memoized response for key: {}", cacheKey);
            return new ChatResponse(
                    cached.getResponse(),
                    cached.getModel() + " (Cached)",
                    request.conversationId() != null ? request.conversationId() : UUID.randomUUID().toString(),
                    System.currentTimeMillis() - start,
                    true,
                    Instant.now()
            );
        }

        // Check L2 Redis cache if available
        if (redisTemplate != null) {
            try {
                String redisVal = redisTemplate.opsForValue().get("cinemind:llmcache:" + cacheKey);
                if (redisVal != null) {
                    log.info("[REDIS CACHE HIT] Returning distributed cached response for key: {}", cacheKey);
                    return new ChatResponse(
                            redisVal,
                            modelName + " (Redis Cached)",
                            request.conversationId() != null ? request.conversationId() : UUID.randomUUID().toString(),
                            System.currentTimeMillis() - start,
                            true,
                            Instant.now()
                    );
                }
            } catch (Exception e) {
                log.debug("Redis cache check skipped: {}", e.getMessage());
            }
        }

        // 3. Cache Miss — Call LLM Provider with automatic resilience failover
        log.info("Processing blocking chat via provider={} (model={}): conversationId={}",
                provider, modelName, request.conversationId());

        String systemPrompt = buildSystemPrompt();
        String content;
        try {
            content = activeClient.prompt()
                    .system(systemPrompt)
                    .user(request.message())
                    .call()
                    .content();
        } catch (Exception ex) {
            log.warn("Primary LLM call ({}) failed with '{}'. Auto-failing over to backup provider ({})",
                    modelName, ex.getMessage(), (useGroq ? GEMINI_MODEL : GROQ_MODEL));
            ChatClient backupClient = useGroq ? geminiChatClient : groqChatClient;
            try {
                content = backupClient.prompt()
                        .system(systemPrompt)
                        .user(request.message())
                        .call()
                        .content();
                modelName = (useGroq ? GEMINI_MODEL : GROQ_MODEL) + " (Failover)";
            } catch (Exception backupEx) {
                log.error("Both LLM providers failed: primary='{}', backup='{}'",
                        ex.getMessage(), backupEx.getMessage());
                content = " CineMind Concierge: External AI providers are currently experiencing temporary rate limits (429). Our box office, ticketing, and concessions services are active. Please retry in a few moments.";
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("Chat completed via {} in {}ms", modelName, elapsed);

        // 4. Save to L1 Cache and L2 Redis Cache (TTL 1 hour)
        cacheManager.put(cacheKey, content, modelName, elapsed, 3600);
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set("cinemind:llmcache:" + cacheKey, content, Duration.ofHours(1));
            } catch (Exception e) {
                log.debug("Redis cache put skipped: {}", e.getMessage());
            }
        }

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
        return chat(request, "groq");
    }

    /**
     * Streaming chat with Prompt Guard verification and multi-provider failover.
     */
    public Flux<String> streamChat(String message, String provider) {
        PromptGuardService.GuardResult guardCheck = promptGuardService.inspect(message);
        if (!guardCheck.isSafe()) {
            return Flux.just(" [SECURITY ALERT] Your input was blocked by CineMind Prompt Guard. Reason: " + guardCheck.reason());
        }

        boolean useGroq = "groq".equalsIgnoreCase(provider);
        ChatClient primaryClient = useGroq ? groqChatClient : geminiChatClient;
        ChatClient backupClient = useGroq ? geminiChatClient : groqChatClient;
        String primaryModel = useGroq ? GROQ_MODEL : GEMINI_MODEL;
        String backupModel = useGroq ? GEMINI_MODEL : GROQ_MODEL;

        log.info("Starting streaming chat via primary provider={} ({})", provider, primaryModel);
        String systemPrompt = buildSystemPrompt();
        try {
            return primaryClient.prompt()
                    .system(systemPrompt)
                    .user(message)
                    .stream()
                    .content()
                    .onErrorResume(ex -> {
                        log.warn("Primary LLM stream ({}) failed with '{}'. Auto-failing over to backup provider ({})",
                                primaryModel, ex.getMessage(), backupModel);
                        try {
                            return backupClient.prompt()
                                    .system(systemPrompt)
                                    .user(message)
                                    .stream()
                                    .content()
                                    .onErrorResume(backupEx -> {
                                        log.error("Both LLM streaming providers exhausted: primary='{}', backup='{}'",
                                                ex.getMessage(), backupEx.getMessage());
                                        return Flux.just(
                                                " CineMind Concierge: External AI providers are currently experiencing temporary rate limits (429). ",
                                                "Our box office ticketing, F&B concessions, seat reservation engines, and digital passes remain fully operational! ",
                                                "Please explore our latest theatrical releases or try asking your query again in a few moments."
                                        );
                                    });
                        } catch (Exception backupSyncEx) {
                            log.error("Backup LLM client threw synchronous exception: {}", backupSyncEx.getMessage());
                            return Flux.just(
                                    " CineMind Concierge: External AI providers are currently experiencing temporary rate limits. ",
                                    "Our box office ticketing, F&B concessions, seat reservation engines, and digital passes remain fully operational!"
                            );
                        }
                    });
        } catch (Exception primarySyncEx) {
            log.warn("Primary LLM client threw synchronous exception: {}. Falling back to backup.", primarySyncEx.getMessage());
            try {
                return backupClient.prompt()
                        .system(systemPrompt)
                        .user(message)
                        .stream()
                        .content()
                        .onErrorResume(backupEx -> Flux.just(
                                " CineMind Concierge: External AI providers are currently experiencing temporary rate limits. ",
                                "Our box office ticketing, F&B concessions, seat reservation engines, and digital passes remain fully operational!"
                        ));
            } catch (Exception allFailed) {
                return Flux.just(
                        " CineMind Concierge: External AI providers are currently experiencing temporary rate limits. ",
                        "Our box office ticketing, F&B concessions, seat reservation engines, and digital passes remain fully operational!"
                );
            }
        }
    }

    public Flux<String> streamChat(String message) {
        return streamChat(message, "groq");
    }
}
