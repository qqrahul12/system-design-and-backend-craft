package com.skills.ai.agent;

/**
 * Visual node representing an agent in the orchestration topology DAG.
 */
public record AgentGraphNode(
        String id,
        String label,
        String avatar,
        String role,
        String status // IDLE, ACTIVE, EXECUTING_TOOL, VERIFYING, COMPLETED, FAILED
) {}
