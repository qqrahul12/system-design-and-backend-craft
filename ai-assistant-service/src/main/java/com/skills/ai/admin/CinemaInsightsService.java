package com.skills.ai.admin;

import java.util.Map;

/**
 * Domain service contract for computing real-time cinema industry benchmarks,
 * macro audience sentiment metrics, and catalog market distributions.
 *
 * <p>Follows the Single Responsibility Principle (SRP) and Separation of Concerns
 * by decoupling domain market analytics from protocol transport registries (e.g., MCP).</p>
 */
public interface CinemaInsightsService {

    /**
     * Calculates real-time cinema industry benchmarks, audience sentiment, and genre distribution
     * based on active movie catalog, ticket sales, and concessions telemetry.
     *
     * @return Structured market intelligence map.
     */
    Map<String, Object> calculateMarketInsights();

    /**
     * Formats structured market intelligence into a clean, human-readable summary string
     * suitable for LLM context injection or MCP tool call text results.
     *
     * @param insights Structured insights map.
     * @return Formatted summary text.
     */
    String formatInsightsAsText(Map<String, Object> insights);
}
