package com.skills.ai.agent;

/**
 * Directed link representing agent communication or dependency flow in the orchestration DAG.
 */
public record AgentGraphEdge(
        String from,
        String to,
        String label
) {}
