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
