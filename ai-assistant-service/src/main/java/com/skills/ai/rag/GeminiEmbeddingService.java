package com.skills.ai.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Native Gemini Embedding Service using {@code gemini-embedding-001}.
 *
 * <p>Generates dense vector embeddings directly using Google AI Studio API,
 * bypassing external proxy incompatibilities.</p>
 */
@Slf4j
@Service
public class GeminiEmbeddingService {

    @Value("${ai.gemini.api-key}")
    private String geminiApiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    private static final String EMBED_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=";

    public GeminiEmbeddingService() {
        this.restClient = RestClient.builder().build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Embeds a single text into a high-dimensional float vector.
     *
     * @param text Input text string.
     * @return List of float values representing the embedding.
     */
    public List<Double> embed(String text) {
        try {
            Map<String, Object> payload = Map.of(
                    "content", Map.of(
                            "parts", List.of(Map.of("text", text))
                    )
            );

            String responseBody = restClient.post()
                    .uri(EMBED_URL + geminiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode valuesNode = root.path("embedding").path("values");

            List<Double> vector = new ArrayList<>();
            if (valuesNode.isArray()) {
                for (JsonNode val : valuesNode) {
                    vector.add(val.asDouble());
                }
            }

            log.debug("Generated embedding vector of dimension: {}", vector.size());
            return vector;
        } catch (Exception e) {
            log.error("Failed to generate embedding from Gemini: {}", e.getMessage(), e);
            throw new RuntimeException("Embedding generation failed: " + e.getMessage(), e);
        }
    }
}
