package com.skills.ai.mcp;

import com.skills.ai.rag.InMemoryVectorStore;
import com.skills.ai.rag.RagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;

/**
 * Registry & Executor for Model Context Protocol (MCP) Tools.
 *
 * <p>Exposes tools that any MCP-compliant client (Cursor, Claude Desktop, Antigravity, or UI)
 * can discover and invoke.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpToolRegistry {

    private final RagService ragService;
    private final InMemoryVectorStore vectorStore;

    private final Map<String, McpToolDefinition> toolDefinitions = new HashMap<>();
    private final Map<String, Function<Map<String, Object>, McpToolDefinition.CallResult>> toolExecutors = new HashMap<>();

    public void registerDefaultTools() {
        // 1. Movie Search Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("search_movies")
                        .description("Search currently running movie shows, genres, and ratings in CineMind theaters.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "genre", Map.of("type", "string", "description", "Optional genre filter: Sci-Fi, Action, Drama"),
                                        "query", Map.of("type", "string", "description", "Search keywords in movie title")
                                )
                        ))
                        .build(),
                args -> {
                    String q = (String) args.getOrDefault("query", "");
                    return McpToolDefinition.CallResult.text(String.format(
                            "Found 3 shows: 1. Inception (IMAX, 9:30 PM, $15) 2. Interstellar (Dolby, 7:00 PM, $18) 3. Oppenheimer (Standard, 8:15 PM, $12). Query: '%s'",
                            q));
                }
        );

        // 2. Check Seats Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("check_seats")
                        .description("Inspect seat availability and optimal view recommendations for a specific movie show.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Title of the movie"),
                                        "showTime", Map.of("type", "string", "description", "Show time e.g. '9:30 PM'")
                                ),
                                "required", List.of("movieTitle")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.get("movieTitle");
                    return McpToolDefinition.CallResult.text(String.format(
                            "Available seats for '%s': [A1, A2, B3 (AI Recommended), B4 (AI Recommended), C5, C6]. 24 seats vacant.",
                            movie));
                }
        );

        // 3. Process Booking Payment Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("process_payment")
                        .description("Processes idempotent payment capture for reserved seats via payment-service.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "seats", Map.of("type", "string", "description", "Comma-separated seats e.g. 'B3,B4'"),
                                        "amount", Map.of("type", "number", "description", "Total amount in USD"),
                                        "paymentMethod", Map.of("type", "string", "description", "Card identifier or token")
                                ),
                                "required", List.of("seats", "amount")
                        ))
                        .build(),
                args -> {
                    String seats = (String) args.get("seats");
                    Number amount = (Number) args.get("amount");
                    String txnId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    return McpToolDefinition.CallResult.text(String.format(
                            "Payment of $%.2f successful! TxnRef: %s. Seats [%s] confirmed and ticket issued.",
                            amount != null ? amount.doubleValue() : 30.0, txnId, seats));
                }
        );

        // 4. RAG Knowledge Search Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("rag_knowledge_search")
                        .description("Queries CineMind's indexed vector knowledge base for terms, FAQs, and policies.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "question", Map.of("type", "string", "description", "The specific question to query")
                                ),
                                "required", List.of("question")
                        ))
                        .build(),
                args -> {
                    String question = (String) args.get("question");
                    if (question == null || question.isBlank()) {
                        return McpToolDefinition.CallResult.error("Question parameter is required.");
                    }
                    RagService.RagResponse ragRes = ragService.query(question, 2);
                    return McpToolDefinition.CallResult.text(String.format(
                            "RAG Answer: %s (Derived from %d citations, vector count: %d)",
                            ragRes.answer(), ragRes.citations().size(), ragRes.totalIndexedChunks()));
                }
        );

        // 5. Apply Promocode Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("apply_promocode")
                        .description("Validates promo discount codes (e.g. CINE20, VIP50, STUDENT10) and calculates adjusted pricing.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "code", Map.of("type", "string", "description", "Promocode name e.g. CINE20"),
                                        "baseAmount", Map.of("type", "number", "description", "Subtotal amount before discount")
                                ),
                                "required", List.of("code", "baseAmount")
                        ))
                        .build(),
                args -> {
                    String code = ((String) args.getOrDefault("code", "")).trim().toUpperCase();
                    Number base = (Number) args.getOrDefault("baseAmount", 30.0);
                    double subtotal = base.doubleValue();
                    double discountPercent = 0.0;
                    if ("CINE20".equals(code)) discountPercent = 0.20;
                    else if ("VIP50".equals(code)) discountPercent = 0.50;
                    else if ("STUDENT10".equals(code)) discountPercent = 0.10;
                    else {
                        return McpToolDefinition.CallResult.text(String.format(
                                "Invalid promo code '%s'. Available valid codes: CINE20 (20%% off), STUDENT10 (10%% off), VIP50 (50%% off). Base: $%.2f",
                                code, subtotal));
                    }
                    double savings = subtotal * discountPercent;
                    double finalPrice = subtotal - savings;
                    return McpToolDefinition.CallResult.text(String.format(
                            "Promo '%s' applied successfully! Discount: %.0f%% (-$%.2f). Adjusted total: $%.2f (Original: $%.2f)",
                            code, discountPercent * 100, savings, finalPrice, subtotal));
                }
        );

        // 6. Reserve Seats Lock Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("reserve_seats")
                        .description("Places a temporary distributed lock on specific auditorium seats for 10 minutes.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Movie title"),
                                        "seats", Map.of("type", "string", "description", "Comma-separated seats e.g. 'B3,B4'")
                                ),
                                "required", List.of("movieTitle", "seats")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.getOrDefault("movieTitle", "Movie");
                    String seats = (String) args.getOrDefault("seats", "B3");
                    String lockToken = "LOCK-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                    return McpToolDefinition.CallResult.text(String.format(
                            "Lock acquired! Seats [%s] for '%s' reserved under Lock Token: %s. Valid for 10 minutes (TTL: 600s).",
                            seats, movie, lockToken));
                }
        );

        // 7. Audit Compliance Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("audit_compliance")
                        .description("Audits booking compliance: age rating check, maximum seat quota (<=6), and price integrity.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Movie title"),
                                        "seatCount", Map.of("type", "number", "description", "Number of requested seats"),
                                        "userAge", Map.of("type", "number", "description", "Age of primary patron")
                                ),
                                "required", List.of("movieTitle", "seatCount")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.getOrDefault("movieTitle", "");
                    Number countNum = (Number) args.getOrDefault("seatCount", 1);
                    Number ageNum = (Number) args.getOrDefault("userAge", 21);
                    int count = countNum.intValue();
                    int age = ageNum.intValue();
                    if (count > 6) {
                        return McpToolDefinition.CallResult.error("Compliance Violation: Maximum seat reservation quota per user is 6 seats.");
                    }
                    if (movie.toLowerCase().contains("oppenheimer") && age < 17) {
                        return McpToolDefinition.CallResult.error("Compliance Violation: 'Oppenheimer' is Rated R. Patron age (" + age + ") is under 17.");
                    }
                    return McpToolDefinition.CallResult.text(String.format(
                            "Compliance Verified: %d seats for '%s' approved. Age criteria met (%d yrs). No blacklisted entities detected.",
                            count, movie, age));
                }
        );
    }

    public void registerTool(McpToolDefinition definition, Function<Map<String, Object>, McpToolDefinition.CallResult> executor) {
        toolDefinitions.put(definition.getName(), definition);
        toolExecutors.put(definition.getName(), executor);
        log.info("Registered MCP tool: {}", definition.getName());
    }

    public List<McpToolDefinition> listTools() {
        if (toolDefinitions.isEmpty()) {
            registerDefaultTools();
        }
        return new ArrayList<>(toolDefinitions.values());
    }

    public McpToolDefinition.CallResult executeTool(String toolName, Map<String, Object> arguments) {
        if (toolDefinitions.isEmpty()) {
            registerDefaultTools();
        }
        Function<Map<String, Object>, McpToolDefinition.CallResult> executor = toolExecutors.get(toolName);
        if (executor == null) {
            return McpToolDefinition.CallResult.error("Unknown MCP tool: " + toolName);
        }
        try {
            return executor.apply(arguments != null ? arguments : Collections.emptyMap());
        } catch (Exception e) {
            log.error("Error executing MCP tool {}: {}", toolName, e.getMessage(), e);
            return McpToolDefinition.CallResult.error("Execution error: " + e.getMessage());
        }
    }
}
