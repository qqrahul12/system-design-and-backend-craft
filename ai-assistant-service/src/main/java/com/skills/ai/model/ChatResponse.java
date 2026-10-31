package com.skills.ai.model;

import java.time.Instant;

/**
 * Outgoing chat response payload.
 *
 * @param response          The assistant's reply text.
 * @param model             The model identifier that generated the response (e.g. {@code gemini-2.0-flash}).
 * @param conversationId    The conversation identifier — echoed back or newly assigned.
 * @param processingTimeMs  Wall-clock time in milliseconds taken to produce the response.
 * @param cachedResponse    {@code true} when the reply was served from a semantic cache (Week 2+).
 * @param timestamp         UTC timestamp of when the response was assembled.
 */
public record ChatResponse(

        String response,
        String model,
        String conversationId,
        long processingTimeMs,
        boolean cachedResponse,
        Instant timestamp

) {}
