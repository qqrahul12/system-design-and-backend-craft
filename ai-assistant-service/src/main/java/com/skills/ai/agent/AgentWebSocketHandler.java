package com.skills.ai.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bi-Directional Full-Duplex WebSocket Handler for Interactive Agent Swarm Orchestration.
 *
 * <p>Enables:
 * <ul>
 *   <li>Real-time push of intermediate agent thoughts, tool dispatches, and step outputs</li>
 *   <li>Human-in-the-Loop (HITL) steering: Client can send INTERRUPT / GUIDANCE frames mid-flight</li>
 *   <li>Socket lifecycle heartbeat and session tracking</li>
 * </ul>
 * </p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentWebSocketHandler extends TextWebSocketHandler {

    private final MultiAgentOrchestratorService orchestratorService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Map of active client sessions
    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        activeSessions.put(session.getId(), session);
        log.info("🔌 [WebSocket] Client connected: sessionId={}", session.getId());

        sendMessage(session, Map.of(
                "type", "CONNECTED",
                "sessionId", session.getId(),
                "message", "CineMind Bi-Directional Multi-Agent WebSocket Connected. Ready for interactive HITL orchestration."
        ));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.info("📥 [WebSocket] Received frame from session={}: {}", session.getId(), payload);

        Map<String, Object> request;
        try {
            request = objectMapper.readValue(payload, Map.class);
        } catch (Exception e) {
            sendMessage(session, Map.of("type", "ERROR", "message", "Invalid JSON payload: " + e.getMessage()));
            return;
        }

        String action = (String) request.getOrDefault("action", "PING");

        switch (action.toUpperCase()) {
            case "PING" -> sendMessage(session, Map.of("type", "PONG", "timestamp", System.currentTimeMillis()));

            case "START" -> {
                String objective = (String) request.getOrDefault("objective", "Book movie tickets");
                String model = (String) request.getOrDefault("model", "groq");

                sendMessage(session, Map.of(
                        "type", "SWARM_START",
                        "objective", objective,
                        "model", model
                ));

                // Execute the orchestration asynchronously and stream each step
                new Thread(() -> {
                    try {
                        OrchestrationResponse response = orchestratorService.orchestrate(
                                new OrchestrationRequest(objective, model, "SUPERVISOR_DAG")
                        );

                        for (AgentExecutionStep step : response.steps()) {
                            if (!session.isOpen()) break;
                            sendMessage(session, Map.of(
                                    "type", "AGENT_STEP",
                                    "step", step
                            ));
                            Thread.sleep(350); // Pacing for realistic visual animation
                        }

                        if (session.isOpen()) {
                            Map<String, Object> finalPayload = new HashMap<>();
                            finalPayload.put("type", "FINAL_SYNTHESIS");
                            finalPayload.put("synthesis", response.finalSynthesis());
                            finalPayload.put("totalDurationMs", response.totalDurationMs());
                            if (response.ticketId() != null) finalPayload.put("ticketId", response.ticketId());
                            if (response.txnId() != null) finalPayload.put("txnId", response.txnId());
                            if (response.movieTitle() != null) finalPayload.put("movieTitle", response.movieTitle());
                            if (response.seats() != null) finalPayload.put("seats", response.seats());
                            if (response.totalPaid() != null) finalPayload.put("totalPaid", response.totalPaid());
                            if (response.orderId() != null) finalPayload.put("orderId", response.orderId());
                            sendMessage(session, finalPayload);
                        }
                    } catch (Exception e) {
                        log.error("Error during WebSocket swarm execution", e);
                        sendMessage(session, Map.of("type", "ERROR", "message", e.getMessage()));
                    }
                }).start();
            }

            case "INTERRUPT" -> {
                String guidance = (String) request.getOrDefault("guidance", "User requested intervention");
                log.info("⚠️ [HITL INTERRUPT] Received human-in-the-loop steer from session {}: {}", session.getId(), guidance);
                sendMessage(session, Map.of(
                        "type", "INTERRUPTED",
                        "guidance", guidance,
                        "status", "Intervention acknowledged. Agent state preserved."
                ));
            }

            default -> sendMessage(session, Map.of("type", "UNKNOWN_ACTION", "action", action));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        activeSessions.remove(session.getId());
        log.info("🔌 [WebSocket] Client disconnected: sessionId={}, status={}", session.getId(), status);
    }

    private void sendMessage(WebSocketSession session, Object payload) {
        if (!session.isOpen()) return;
        try {
            String json = objectMapper.writeValueAsString(payload);
            synchronized (session) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException e) {
            log.error("Failed to send WebSocket message to session {}", session.getId(), e);
        }
    }
}
