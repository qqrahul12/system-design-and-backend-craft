package com.skills.ai.agent;

import java.util.List;

/**
 * Model representing a specialized agent persona in the multi-agent swarm.
 */
public record AgentPersona(
        String id,
        String name,
        String avatar,
        String role,
        String description,
        List<String> assignedTools,
        String modelTier
) {}
