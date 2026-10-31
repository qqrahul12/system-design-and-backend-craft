package com.skills.ai.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Enterprise RAG (Retrieval-Augmented Generation) Orchestration Service.
 *
 * <p>Implements the complete end-to-end RAG architecture:
 * <ol>
 *   <li>Chunking documents into context windows.</li>
 *   <li>Generating semantic embeddings via {@link GeminiEmbeddingService}.</li>
 *   <li>Indexing vectors into {@link InMemoryVectorStore}.</li>
 *   <li>Retrieving Top-K relevant contexts on query.</li>
 *   <li>Augmenting the prompt and generating verified citations with Gemini 2.0.</li>
 * </ol>
 * </p>
 */
@Slf4j
@Service
public class RagService {

    private final GeminiEmbeddingService embeddingService;
    private final InMemoryVectorStore vectorStore;
    private final ChatClient geminiChatClient;

    public RagService(GeminiEmbeddingService embeddingService,
                      InMemoryVectorStore vectorStore,
                      @Qualifier("geminiChatClient") ChatClient geminiChatClient) {
        this.embeddingService = embeddingService;
        this.vectorStore = vectorStore;
        this.geminiChatClient = geminiChatClient;
    }

    /**
     * Ingests and indexes a text document by chunking, embedding, and storing.
     */
    public int ingestDocument(String title, String rawText, int chunkSize) {
        log.info("Starting document ingestion: title={}, contentLength={}", title, rawText.length());

        List<String> chunks = splitIntoChunks(rawText, chunkSize > 0 ? chunkSize : 400);
        int indexedCount = 0;

        for (int i = 0; i < chunks.size(); i++) {
            String chunk = chunks.get(i);
            List<Double> embedding = embeddingService.embed(chunk);

            VectorDocument doc = VectorDocument.builder()
                    .id(UUID.randomUUID().toString())
                    .title(title)
                    .content(chunk)
                    .embedding(embedding)
                    .metadata(Map.of("chunkIndex", i, "totalChunks", chunks.size(), "title", title))
                    .build();

            vectorStore.save(doc);
            indexedCount++;
        }

        log.info("Successfully ingested document '{}' into {} indexed chunks", title, indexedCount);
        return indexedCount;
    }

    /**
     * Answers a user query using the RAG pipeline.
     */
    public RagResponse query(String question, int topK) {
        long start = System.currentTimeMillis();
        int k = topK > 0 ? topK : 3;

        // 1. Embed query
        List<Double> queryVector = embeddingService.embed(question);

        // 2. Vector search
        List<VectorDocument> matchedDocs = vectorStore.similaritySearch(queryVector, k);

        // 3. Assemble context
        String context = matchedDocs.stream()
                .map(doc -> String.format("[Source: %s | Score: %.2f]\n%s",
                        doc.getTitle(), doc.getSimilarityScore(), doc.getContent()))
                .collect(Collectors.joining("\n\n---\n\n"));

        // 4. Augment prompt
        String ragPrompt = String.format("""
                You are CineMind RAG Intelligence. Answer the user question strictly using the provided context.
                If the answer cannot be found in the context, clearly state that you don't know based on the provided documents.
                Always cite your sources where relevant.

                --- CONTEXT ---
                %s

                --- QUESTION ---
                %s
                """, context.isEmpty() ? "No relevant documents found." : context, question);

        // 5. Generate response
        String answer = geminiChatClient.prompt()
                .user(ragPrompt)
                .call()
                .content();

        long elapsed = System.currentTimeMillis() - start;

        List<Citation> citations = matchedDocs.stream()
                .map(doc -> new Citation(doc.getTitle(), doc.getContent(), doc.getSimilarityScore()))
                .collect(Collectors.toList());

        return new RagResponse(answer, citations, vectorStore.size(), elapsed);
    }

    private List<String> splitIntoChunks(String text, int targetChunkSize) {
        List<String> chunks = new ArrayList<>();
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();

        for (String word : words) {
            if (current.length() + word.length() + 1 > targetChunkSize && current.length() > 0) {
                chunks.add(current.toString().trim());
                current = new StringBuilder();
            }
            if (current.length() > 0) current.append(" ");
            current.append(word);
        }
        if (current.length() > 0) {
            chunks.add(current.toString().trim());
        }
        return chunks;
    }

    public record Citation(String source, String snippet, double relevanceScore) {}
    public record RagResponse(String answer, List<Citation> citations, int totalIndexedChunks, long processingTimeMs) {}
}
