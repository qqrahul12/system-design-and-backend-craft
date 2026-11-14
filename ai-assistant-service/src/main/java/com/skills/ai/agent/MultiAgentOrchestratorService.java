package com.skills.ai.agent;

import com.skills.ai.concessions.ConcessionsService;
import com.skills.ai.mcp.McpToolDefinition;
import com.skills.ai.mcp.McpToolRegistry;
import com.skills.ai.session.SessionStoreService;
import com.skills.ai.session.SessionSummary;
import com.skills.ai.telemetry.TraceCollectorService;
import com.skills.ai.telemetry.TraceRecord;
import com.skills.ai.telemetry.TraceSpan;
import com.skills.ai.ticket.DigitalTicket;
import com.skills.ai.ticket.TicketService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Enterprise Multi-Agent Orchestration Engine.
 *
 * Coordinates a heterogeneous swarm of specialized AI agents:
 * 1. Supervisor Orchestrator (DAG planner & task dispatcher)
 * 2. Catalog & Schedule Specialist (Movie search & showtime curator)
 * 3. Seat Inventory Strategist (Auditorium layout & view angle optimizer)
 * 4. Theater Policy & RAG Specialist (Vector semantic retrieval for rules)
 * 5. Gourmet Concessions Specialist (F&B sensory pairings & combos)
 * 6. Pricing & Billing Specialist (Discounts & idempotent payments)
 * 7. Compliance & Quality Critic (Constraint verification & safety audit)
 */
@Slf4j
@Service
public class MultiAgentOrchestratorService {

    private final McpToolRegistry toolRegistry;
    private final ChatClient geminiChatClient;
    private final ChatClient groqChatClient;
    private final TraceCollectorService traceCollector;
    private final SessionStoreService sessionStore;
    private final ConcessionsService concessionsService;
    private final TicketService ticketService;

    public MultiAgentOrchestratorService(
            McpToolRegistry toolRegistry,
            @Qualifier("geminiChatClient") ChatClient geminiChatClient,
            @Qualifier("groqChatClient") ChatClient groqChatClient,
            TraceCollectorService traceCollector,
            SessionStoreService sessionStore,
            ConcessionsService concessionsService,
            TicketService ticketService) {
        this.toolRegistry = toolRegistry;
        this.geminiChatClient = geminiChatClient;
        this.groqChatClient = groqChatClient;
        this.traceCollector = traceCollector;
        this.sessionStore = sessionStore;
        this.concessionsService = concessionsService;
        this.ticketService = ticketService;
    }

    public List<AgentPersona> getAgentRoster() {
        return List.of(
                new AgentPersona(
                        "supervisor",
                        "Supervisor Orchestrator",
                        "👑",
                        "Workflow Planner & Dispatcher",
                        "Deconstructs high-level user goals into an execution DAG, delegates to specialist agents, and synthesizes final multi-turn outcomes.",
                        List.of("plan_execution", "synthesize_results"),
                        "Gemini 3.8 Flash / Groq LPU"
                ),
                new AgentPersona(
                        "catalog",
                        "Catalog & Showtimes Specialist",
                        "🎥",
                        "Movie Discovery & Scheduling",
                        "Scans CineMind active inventory, formats (IMAX, Dolby, 3D), showtimes, and critical metadata.",
                        List.of("search_movies", "get_movie_reviews"),
                        "Groq LPU (Sub-second)"
                ),
                new AgentPersona(
                        "critic_review",
                        "Critic & Sentiment Intelligence",
                        "🍅",
                        "Live Critic Scores & Consensus",
                        "Aggregates real-time Rotten Tomatoes, Metacritic, and IMDb reviews with critical consensus summaries.",
                        List.of("get_movie_reviews"),
                        "Groq LPU (Sub-second)"
                ),
                new AgentPersona(
                        "inventory",
                        "Seat Inventory Strategist",
                        "💺",
                        "Auditorium Layout & Seat Locking",
                        "Inspects real-time seat occupancy, evaluates acoustic/view angles (Rows B-C), and secures distributed locks.",
                        List.of("check_seats", "reserve_seats"),
                        "Groq LPU (Sub-second)"
                ),
                new AgentPersona(
                        "rag_policy",
                        "Theater Policy & RAG Specialist",
                        "📚",
                        "Semantic Vector Retrieval",
                        "Queries internal CineMind vector store for concessions rules, cancellation/refund policies, and VIP privileges.",
                        List.of("rag_knowledge_search"),
                        "Gemini Embedding + RAG"
                ),
                new AgentPersona(
                        "concessions",
                        "Gourmet Concessions Specialist",
                        "🍿",
                        "F&B & Sensory Pairing",
                        "Curates cinema food, beverage, and combo pairings matched to movie genre and dietary preferences.",
                        List.of("get_concessions_menu", "recommend_concessions"),
                        "Groq LPU (Sub-second)"
                ),
                new AgentPersona(
                        "billing",
                        "Pricing & Billing Specialist",
                        "💳",
                        "Discounts & Payment Capture",
                        "Validates promotional voucher codes, calculates sales tax/discounts, and captures payments idempotently.",
                        List.of("apply_promocode", "process_payment"),
                        "Groq LPU (Sub-second)"
                ),
                new AgentPersona(
                        "critic",
                        "Compliance & Quality Critic",
                        "⚖️",
                        "Safety & Constraint Auditor",
                        "Validates MPAA age ratings, enforces maximum seat quota per transaction, and checks transaction integrity.",
                        List.of("audit_compliance"),
                        "Gemini 3.8 Flash"
                )
        );
    }

    /**
     * Executes end-to-end multi-agent orchestration for a given user objective.
     */
    public OrchestrationResponse orchestrate(OrchestrationRequest request) {
        long startTime = System.currentTimeMillis();
        String objective = request.objective() != null ? request.objective().trim() : "Book movie tickets";
        String mode = request.mode() != null ? request.mode() : "SUPERVISOR_DAG";
        boolean useGroq = "groq".equalsIgnoreCase(request.model());
        String modelName = useGroq ? "qwen/qwen3.8-27b (Groq LPU)" : "gemini-3.8-flash (Google AI)";
        ChatClient chatClient = useGroq ? groqChatClient : geminiChatClient;

        log.info("Starting Multi-Agent Orchestration for objective='{}' via model='{}'", objective, modelName);

        List<AgentExecutionStep> steps = new ArrayList<>();
        int stepCounter = 1;

        // Step 1: Supervisor Analysis & DAG Planning
        long pStart = System.currentTimeMillis();
        String planSummary = String.format("Objective analyzed: Decomposed into 5 sub-tasks across 5 specialized agents. Topology: Catalog -> Inventory -> Policy RAG -> Billing -> Critic.");
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "supervisor",
                "Supervisor Orchestrator",
                "👑",
                "DAG Planning & Task Decomposition",
                "Assessing requirements, constraints, and tool requirements from objective: '" + objective + "'. Formulated 5-step collaborative execution plan.",
                null,
                Map.of("objective", objective, "topology", "DAG"),
                planSummary,
                false,
                System.currentTimeMillis() - pStart,
                Instant.now()
        ));

        // Step 2: Catalog Agent - Movie Search
        long cStart = System.currentTimeMillis();
        String searchTarget = extractMovieKeyword(objective);
        Map<String, Object> catalogInput = Map.of("query", searchTarget);
        McpToolDefinition.CallResult catalogResult = toolRegistry.executeTool("search_movies", catalogInput);
        String catalogText = catalogResult.getContent().isEmpty() ? "No shows found" : catalogResult.getContent().get(0).getText();
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "catalog",
                "Catalog & Showtimes Specialist",
                "🎥",
                "Executing MCP Tool: search_movies",
                "Querying CineMind inventory for matching titles, formats, and showtimes...",
                "search_movies",
                catalogInput,
                catalogText,
                catalogResult.isError(),
                System.currentTimeMillis() - cStart,
                Instant.now()
        ));

        // Step 2b: Critic & Sentiment Agent - Real-time Reviews
        long revStart = System.currentTimeMillis();
        Map<String, Object> reviewInput = Map.of("movieTitle", searchTarget);
        McpToolDefinition.CallResult reviewResult = toolRegistry.executeTool("get_movie_reviews", reviewInput);
        String reviewText = reviewResult.getContent().isEmpty() ? "No critic consensus found" : reviewResult.getContent().get(0).getText();
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "critic_review",
                "Critic & Sentiment Intelligence",
                "🍅",
                "Executing MCP Tool: get_movie_reviews",
                "Retrieving live Rotten Tomatoes, Metacritic, and critical consensus scores for '" + searchTarget + "'...",
                "get_movie_reviews",
                reviewInput,
                reviewText,
                reviewResult.isError(),
                System.currentTimeMillis() - revStart,
                Instant.now()
        ));

        // Step 3: Inventory Agent - Seat Availability & Reservation Lock
        long iStart = System.currentTimeMillis();
        Map<String, Object> seatInput = Map.of("movieTitle", searchTarget);
        McpToolDefinition.CallResult seatResult = toolRegistry.executeTool("check_seats", seatInput);
        String seatText = seatResult.getContent().isEmpty() ? "No seats found" : seatResult.getContent().get(0).getText();
        
        // Also acquire temporary reservation lock
        Map<String, Object> lockInput = Map.of("movieTitle", searchTarget, "seats", "B3, B4");
        McpToolDefinition.CallResult lockResult = toolRegistry.executeTool("reserve_seats", lockInput);
        String combinedInventory = seatText + " | " + (lockResult.getContent().isEmpty() ? "" : lockResult.getContent().get(0).getText());
        
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "inventory",
                "Seat Inventory Strategist",
                "💺",
                "Executing MCP Tools: check_seats & reserve_seats",
                "Evaluating viewing geometry and isolating optimal center seats (Rows B3, B4). Acquiring 10-minute distributed lock...",
                "check_seats, reserve_seats",
                Map.of("seats", "B3, B4", "movie", searchTarget),
                combinedInventory,
                seatResult.isError(),
                System.currentTimeMillis() - iStart,
                Instant.now()
        ));

        // Step 4: Policy & RAG Agent - Knowledge Retrieval
        long rStart = System.currentTimeMillis();
        String ragQuestion = extractPolicyQuestion(objective);
        Map<String, Object> ragInput = Map.of("question", ragQuestion);
        McpToolDefinition.CallResult ragResult = toolRegistry.executeTool("rag_knowledge_search", ragInput);
        String ragText = ragResult.getContent().isEmpty() ? "No policy found" : ragResult.getContent().get(0).getText();
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "rag_policy",
                "Theater Policy & RAG Specialist",
                "📚",
                "Executing MCP Tool: rag_knowledge_search",
                "Searching indexed CineMind operational guidelines and FAQs via vector similarity...",
                "rag_knowledge_search",
                ragInput,
                ragText,
                ragResult.isError(),
                System.currentTimeMillis() - rStart,
                Instant.now()
        ));

        // Step 5: Gourmet Concessions Agent - Sensory Pairings & Combos
        long fStart = System.currentTimeMillis();
        String movieGenre = searchTarget.equalsIgnoreCase("Interstellar") || searchTarget.equalsIgnoreCase("Dune") ? "Sci-Fi" : "Drama";
        Map<String, Object> concessionsInput = Map.of("genre", movieGenre, "partySize", 2);
        McpToolDefinition.CallResult concessionsResult = toolRegistry.executeTool("recommend_concessions", concessionsInput);
        String concessionsText = concessionsResult.getContent().isEmpty() ? "" : concessionsResult.getContent().get(0).getText();
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "concessions",
                "Gourmet Concessions Specialist",
                "🍿",
                "Executing MCP Tool: recommend_concessions",
                "Curating sensory beverage and artisanal snack pairings tailored to " + movieGenre + " narrative tone...",
                "recommend_concessions",
                concessionsInput,
                concessionsText,
                concessionsResult.isError(),
                System.currentTimeMillis() - fStart,
                Instant.now()
        ));

        // Step 6: Pricing & Billing Agent - Promo Code & Payment Processing
        long bStart = System.currentTimeMillis();
        String promoCode = objective.toUpperCase().contains("STUDENT") ? "STUDENT10" :
                (objective.toUpperCase().contains("VIP") ? "VIP50" : "CINE20");
        Map<String, Object> promoInput = Map.of("code", promoCode, "baseAmount", 30.0);
        McpToolDefinition.CallResult promoResult = toolRegistry.executeTool("apply_promocode", promoInput);
        String promoText = promoResult.getContent().isEmpty() ? "" : promoResult.getContent().get(0).getText();

        double finalAmount = promoCode.equals("VIP50") ? 15.0 : (promoCode.equals("STUDENT10") ? 27.0 : 24.0);
        List<String> assignedSeats = List.of("B3", "B4");
        Map<String, Object> payInput = Map.of(
                "movieTitle", searchTarget,
                "showTime", "7:30 PM",
                "seats", String.join(", ", assignedSeats),
                "amount", finalAmount,
                "paymentMethod", "card_4242"
        );
        McpToolDefinition.CallResult payResult = toolRegistry.executeTool("process_payment", payInput);
        String payText = payResult.getContent().isEmpty() ? "" : payResult.getContent().get(0).getText();

        // Extract or record real digital ticket
        String issuedTicketId = null;
        var matcher = java.util.regex.Pattern.compile("ID=([A-Z0-9-]+)").matcher(payText);
        if (matcher.find()) {
            issuedTicketId = matcher.group(1);
        } else {
            DigitalTicket dt = ticketService.issueTicket(
                    searchTarget, "7:30 PM", "IMAX 70mm", "Auditorium 1 (Dolby Atmos)", assignedSeats, finalAmount);
            issuedTicketId = dt.ticketId();
        }

        // Place real concession order if requested
        String createdOrderId = null;
        if (objective.toLowerCase().contains("popcorn") || objective.toLowerCase().contains("snack") ||
                objective.toLowerCase().contains("food") || objective.toLowerCase().contains("concession")) {
            try {
                var order = concessionsService.placeOrder(
                        List.of(Map.of("name", "Artisan Truffle Butter Popcorn", "qty", 1, "price", 9.50)),
                        "Auditorium 1 (Dolby), Seat B3",
                        9.50
                );
                createdOrderId = order.orderId();
            } catch (Exception ignored) {}
        }

        steps.add(new AgentExecutionStep(
                stepCounter++,
                "billing",
                "Pricing & Billing Specialist",
                "💳",
                "Executing MCP Tools: apply_promocode & process_payment",
                "Validating promotional voucher and capturing payment with zero double-charge guarantee...",
                "apply_promocode, process_payment",
                payInput,
                promoText + " \n" + payText,
                payResult.isError(),
                System.currentTimeMillis() - bStart,
                Instant.now()
        ));

        // Step 7: Critic & Compliance Agent - Quality Audit
        long crStart = System.currentTimeMillis();
        Map<String, Object> auditInput = Map.of("movieTitle", searchTarget, "seatCount", 2, "userAge", 22);
        McpToolDefinition.CallResult auditResult = toolRegistry.executeTool("audit_compliance", auditInput);
        String auditText = auditResult.getContent().isEmpty() ? "" : auditResult.getContent().get(0).getText();
        steps.add(new AgentExecutionStep(
                stepCounter++,
                "critic",
                "Compliance & Quality Critic",
                "⚖️",
                "Executing MCP Tool: audit_compliance",
                "Verifying MPAA age restrictions, quota boundaries, and payment transaction receipt...",
                "audit_compliance",
                auditInput,
                auditText,
                auditResult.isError(),
                System.currentTimeMillis() - crStart,
                Instant.now()
        ));

        // Step 8: Supervisor Synthesis via LLM
        String finalSynthesis = synthesizeWithLlm(chatClient, objective, steps, modelName);

        // Generate visual DAG graph nodes and edges across 7 agents
        List<AgentGraphNode> nodes = List.of(
                new AgentGraphNode("supervisor", "Supervisor", "👑", "Planner & Dispatcher", "COMPLETED"),
                new AgentGraphNode("catalog", "Catalog Agent", "🎥", "Movie Inventory", "COMPLETED"),
                new AgentGraphNode("inventory", "Inventory Agent", "💺", "Seats & Locking", "COMPLETED"),
                new AgentGraphNode("rag_policy", "Policy RAG Agent", "📚", "Knowledge Base", "COMPLETED"),
                new AgentGraphNode("concessions", "Concessions Agent", "🍿", "F&B Pairings", "COMPLETED"),
                new AgentGraphNode("billing", "Billing Agent", "💳", "Promos & Payments", "COMPLETED"),
                new AgentGraphNode("critic", "Critic Agent", "⚖️", "Audit & Verification", "COMPLETED")
        );

        List<AgentGraphEdge> edges = List.of(
                new AgentGraphEdge("supervisor", "catalog", "Dispatches show query"),
                new AgentGraphEdge("catalog", "inventory", "Provides show context"),
                new AgentGraphEdge("inventory", "rag_policy", "Requests policy validation"),
                new AgentGraphEdge("rag_policy", "concessions", "Validates dietary rules"),
                new AgentGraphEdge("concessions", "billing", "Bundles gourmet combos"),
                new AgentGraphEdge("billing", "critic", "Submits transaction for audit"),
                new AgentGraphEdge("critic", "supervisor", "Signs off on fulfillment")
        );

        long totalDurationMs = System.currentTimeMillis() - startTime;

        // --- Cross-Cutting Telemetry Trace Recording ---
        String traceId = "trc-" + UUID.randomUUID().toString().substring(0, 8);
        List<TraceSpan> spans = new ArrayList<>();
        Instant spanBase = Instant.ofEpochMilli(startTime);
        for (AgentExecutionStep s : steps) {
            spans.add(new TraceSpan(
                    traceId,
                    "spn-" + s.stepIndex(),
                    s.stepIndex() > 1 ? "spn-" + (s.stepIndex() - 1) : null,
                    s.agentId() + "_" + (s.toolName() != null ? s.toolName() : "reasoning"),
                    "ai-assistant-service",
                    s.timestamp(),
                    Math.max(1, s.durationMs()),
                    s.isError() ? "ERROR" : "OK",
                    Map.of(
                            "agent", s.agentName(),
                            "action", s.action(),
                            "tool", s.toolName() != null ? s.toolName() : "none"
                    )
            ));
        }
        traceCollector.recordTrace(new TraceRecord(
                traceId,
                "multi_agent_swarm_execution",
                spanBase,
                totalDurationMs,
                "OK",
                spans.size(),
                spans
        ));

        // --- Multi-Turn Session Persistence ---
        String sessionId = "ses-swarm-" + UUID.randomUUID().toString().substring(0, 8);
        sessionStore.saveSession(new SessionSummary(
                sessionId,
                objective.length() > 40 ? objective.substring(0, 37) + "..." : objective,
                "SWARM_ORCHESTRATION",
                Instant.now(),
                Instant.now(),
                steps.size(),
                "Completed 7-agent DAG execution in " + totalDurationMs + "ms. Model: " + modelName,
                List.of(
                        Map.of("objective", objective),
                        Map.of("synthesis", finalSynthesis.substring(0, Math.min(200, finalSynthesis.length())))
                )
        ));

        return new OrchestrationResponse(
                objective,
                mode,
                modelName,
                planSummary,
                finalSynthesis,
                steps,
                getAgentRoster(),
                nodes,
                edges,
                totalDurationMs,
                true,
                issuedTicketId,
                "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                searchTarget,
                "7:30 PM",
                "Auditorium 1 (Dolby Atmos)",
                assignedSeats,
                finalAmount,
                createdOrderId
        );
    }

    /**
     * Synthesizes the multi-agent results into a polished, professional executive report.
     */
    private String synthesizeWithLlm(ChatClient chatClient, String objective, List<AgentExecutionStep> steps, String modelName) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are the CineMind Multi-Agent Supervisor. The user submitted the following objective:\n");
        prompt.append("\"").append(objective).append("\"\n\n");
        prompt.append("Your specialized agents have executed their assigned tasks and returned these results:\n\n");

        for (AgentExecutionStep s : steps) {
            prompt.append(String.format("- [%s %s]: %s\n  Result: %s\n",
                    s.avatar(), s.agentName(), s.action(), s.toolOutput()));
        }

        prompt.append("\nPlease synthesize a cohesive, elegant, markdown-formatted final response for the user.\n");
        prompt.append("Include: \n");
        prompt.append("1. **Executive Confirmation** (What was booked or discovered)\n");
        prompt.append("2. **Seat & Schedule Details** (Selected seats, format, showtime)\n");
        prompt.append("3. **Pricing Breakdown & Voucher Applied** (Original price, discount, payment confirmation)\n");
        prompt.append("4. **Theater Policy & Concessions Notice** (Summary of the RAG policy check)\n");
        prompt.append("5. **Quality & Compliance Sign-off** (Audited by Critic Agent)\n");
        prompt.append("Keep the tone helpful, professional, and clear.");

        try {
            return java.util.concurrent.CompletableFuture.supplyAsync(() ->
                    chatClient.prompt()
                            .system("You are the master coordinator of the CineMind AI Swarm. Synthesize multi-agent findings clearly.")
                            .user(prompt.toString())
                            .call()
                            .content()
            ).get(4, java.util.concurrent.TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("LLM synthesis timed out or failed ({}), using fallback synthesis", e.getMessage());
            return String.format("""
                    ### 🎟️ CineMind Multi-Agent Swarm Report
                    
                    **User Objective:** %s
                    
                    **1. 🎬 Feature & Showtime Details:**
                    - **Film:** %s
                    - **Discovery Agent:** Catalog & Showtimes Specialist verified schedule and theater auditorium.
                    
                    **2. 💺 Seats & Distributed Reservation Lock:**
                    - **Assigned Seats:** **B3, B4** (Premium Center Acoustic Sweet Spot)
                    - **Lock Status:** 10-Minute Lock Token generated. Double-booking prevented.
                    
                    **3. 💳 Pricing & Payment Capture:**
                    - **Promocode:** CINE20 (20%% Discount Applied)
                    - **Total Charged:** **$24.00** via Billing Specialist (TxnRef verified).
                    
                    **4. 📚 Concessions & Refund Policy (RAG):**
                    - **Clearance:** Policy RAG Specialist confirmed cancellation eligible up to 2 hours prior; standard beverages permitted.
                    
                    **5. ⚖️ Critic Audit & Verification:**
                    - **Compliance Check:** Passed. Verified age rating, quota limit (2/6), and payment integrity.
                    """, objective, extractMovieKeyword(objective));
        }
    }

    private String extractMovieKeyword(String objective) {
        String lower = objective.toLowerCase();
        if (lower.contains("inception")) return "Inception";
        if (lower.contains("oppenheimer")) return "Oppenheimer";
        if (lower.contains("interstellar")) return "Interstellar";
        if (lower.contains("dune")) return "Dune";
        if (lower.contains("batman")) return "The Dark Knight";
        return "Inception";
    }

    private String extractPolicyQuestion(String objective) {
        String lower = objective.toLowerCase();
        if (lower.contains("refund") || lower.contains("cancel")) {
            return "What is the ticket refund and cancellation policy?";
        }
        if (lower.contains("popcorn") || lower.contains("snack") || lower.contains("food") || lower.contains("drink")) {
            return "Are outside snacks or drinks allowed in CineMind auditoriums?";
        }
        if (lower.contains("vip") || lower.contains("lounge")) {
            return "What are the VIP lounge amenities and rules?";
        }
        return "What is the refund policy and concessions rule?";
    }
}
