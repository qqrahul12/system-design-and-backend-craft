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
        boolean success
) {}
