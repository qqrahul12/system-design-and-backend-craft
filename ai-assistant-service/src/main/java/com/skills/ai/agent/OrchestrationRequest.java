package com.skills.ai.agent;

/**
 * Request payload for initiating multi-agent orchestration.
 */
public record OrchestrationRequest(
        String objective,
        String model, // "gemini" or "groq"
        String mode   // "SUPERVISOR_DAG", "PEER_COLLABORATIVE", "PLAN_AND_SOLVE"
) {}
