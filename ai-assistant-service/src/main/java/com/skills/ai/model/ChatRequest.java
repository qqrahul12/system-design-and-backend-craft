package com.skills.ai.model;

import jakarta.validation.constraints.NotBlank;

/**
 * Incoming chat request payload.
 *
 * @param message        The user's message. Must not be blank.
 * @param conversationId Optional conversation identifier for future memory/session support.
 *                       May be {@code null} on the first turn of a new conversation.
 * @param useRag         Whether to activate Retrieval-Augmented Generation (Week 1: always false).
 */
public record ChatRequest(

        @NotBlank(message = "message must not be blank")
        String message,

        String conversationId,

        boolean useRag

) {
    /**
     * Compact canonical constructor — normalises {@code conversationId} by trimming whitespace.
     */
    public ChatRequest {
        if (conversationId != null) {
            conversationId = conversationId.isBlank() ? null : conversationId.trim();
        }
    }
}
