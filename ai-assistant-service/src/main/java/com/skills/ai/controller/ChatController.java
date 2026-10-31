package com.skills.ai.controller;

import com.skills.ai.model.ChatRequest;
import com.skills.ai.model.ChatResponse;
import com.skills.ai.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * REST controller exposing the chat API endpoints.
 *
 * <ul>
 *   <li>{@code POST /api/v1/chat}        — blocking, returns a complete {@link ChatResponse}.</li>
 *   <li>{@code GET  /api/v1/chat/stream} — SSE streaming, emits token chunks then a {@code [DONE]} sentinel.</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * Blocking chat endpoint.
     *
     * <p>Accepts a {@link ChatRequest} body, delegates to {@link ChatService#chat(ChatRequest)},
     * and returns the full assistant reply wrapped in a {@link ChatResponse}.</p>
     *
     * @param request Validated request body.
     * @return 200 OK with the complete chat response.
     */
    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @RequestParam(required = false, defaultValue = "gemini") String provider) {
        log.debug("POST /api/v1/chat  provider={} conversationId={}", provider, request.conversationId());
        ChatResponse response = chatService.chat(request, provider);
        return ResponseEntity.ok(response);
    }

    /**
     * Streaming chat endpoint using Server-Sent Events.
     *
     * <p>Streams each token chunk as a {@code message} event.
     * After all chunks are emitted, a final {@code done} event with data {@code [DONE]} is sent
     * so the client knows the stream has ended.</p>
     *
     * @param message The user's message text (passed as a query parameter).
     * @param provider "gemini" or "groq" (defaults to "gemini").
     * @return A reactive {@link Flux} of {@link ServerSentEvent} objects.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChat(
            @RequestParam String message,
            @RequestParam(required = false, defaultValue = "gemini") String provider) {
        log.debug("GET /api/v1/chat/stream  provider={} messageLength={}", provider, message.length());

        Flux<ServerSentEvent<String>> tokenEvents = chatService.streamChat(message, provider)
                .map(chunk -> ServerSentEvent.<String>builder()
                        .event("message")
                        .data(chunk)
                        .build());

        ServerSentEvent<String> doneEvent = ServerSentEvent.<String>builder()
                .event("done")
                .data("[DONE]")
                .build();

        return tokenEvents.concatWith(Flux.just(doneEvent));
    }
}
