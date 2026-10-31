package com.skills.ai.rag;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Thread-safe In-Memory Vector Store with Cosine Similarity Search.
 *
 * <p>Provides immediate zero-dependency semantic vector search capabilities,
 * fully swappable with pgvector or Pinecone in production.</p>
 */
@Slf4j
@Component
public class InMemoryVectorStore {

    private final Map<String, VectorDocument> documentIndex = new ConcurrentHashMap<>();

    /**
     * Stores a document chunk with its vector embedding.
     */
    public void save(VectorDocument doc) {
        if (doc.getId() == null) {
            doc.setId(UUID.randomUUID().toString());
        }
        documentIndex.put(doc.getId(), doc);
        log.info("Saved vector document: id={}, title={}, vectorDim={}",
                doc.getId(), doc.getTitle(), doc.getEmbedding() != null ? doc.getEmbedding().size() : 0);
    }

    /**
     * Performs Top-K Semantic Similarity Search using Cosine Similarity.
     *
     * @param queryVector Query vector representation.
     * @param topK Number of closest neighbors to return.
     * @return List of matching VectorDocuments ordered by highest similarity.
     */
    public List<VectorDocument> similaritySearch(List<Double> queryVector, int topK) {
        if (queryVector == null || queryVector.isEmpty() || documentIndex.isEmpty()) {
            return Collections.emptyList();
        }

        List<VectorDocument> ranked = documentIndex.values().stream()
                .filter(doc -> doc.getEmbedding() != null && doc.getEmbedding().size() == queryVector.size())
                .map(doc -> {
                    double similarity = cosineSimilarity(queryVector, doc.getEmbedding());
                    return VectorDocument.builder()
                            .id(doc.getId())
                            .title(doc.getTitle())
                            .content(doc.getContent())
                            .embedding(doc.getEmbedding())
                            .metadata(doc.getMetadata())
                            .similarityScore(similarity)
                            .build();
                })
                .sorted(Comparator.comparingDouble(VectorDocument::getSimilarityScore).reversed())
                .limit(topK)
                .collect(Collectors.toList());

        log.debug("Similarity search found {} results (top score={})",
                ranked.size(), ranked.isEmpty() ? 0 : ranked.get(0).getSimilarityScore());
        return ranked;
    }

    public int size() {
        return documentIndex.size();
    }

    public void clear() {
        documentIndex.clear();
    }

    /**
     * Computes the Cosine Similarity between two N-dimensional vectors:
     * cos(θ) = (A · B) / (||A|| * ||B||)
     */
    public static double cosineSimilarity(List<Double> vA, List<Double> vB) {
        if (vA.size() != vB.size()) return 0.0;

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < vA.size(); i++) {
            double a = vA.get(i);
            double b = vB.get(i);
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA == 0.0 || normB == 0.0) return 0.0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
