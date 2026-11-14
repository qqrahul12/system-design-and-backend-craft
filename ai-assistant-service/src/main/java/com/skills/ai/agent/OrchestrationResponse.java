package com.skills.ai.agent;

import java.util.List;

/**
 * Result payload containing the full multi-agent orchestration trace, status, and synthesis.
 */
public record OrchestrationResponse(
        String objective,
        String executionMode,
        String modelUsed,
        String planSummary,
        String finalSynthesis,
        List<AgentExecutionStep> steps,
        List<AgentPersona> agents,
        List<AgentGraphNode> nodes,
        List<AgentGraphEdge> edges,
        long totalDurationMs,
        boolean success,
        String ticketId,
        String txnId,
        String movieTitle,
        String showTime,
        String auditorium,
        List<String> seats,
        Double totalPaid,
        String orderId
) {
    public OrchestrationResponse(
            String objective,
            String executionMode,
            String modelUsed,
            String planSummary,
            String finalSynthesis,
            List<AgentExecutionStep> steps,
            List<AgentPersona> agents,
            List<AgentGraphNode> nodes,
            List<AgentGraphEdge> edges,
            long totalDurationMs,
            boolean success
    ) {
        this(objective, executionMode, modelUsed, planSummary, finalSynthesis, steps, agents, nodes, edges, totalDurationMs, success,
                null, null, null, null, null, null, null, null);
    }
}
