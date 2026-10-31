package com.skills.ai.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Representation of an indexed document chunk in the Vector Store.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VectorDocument {
    private String id;
    private String title;
    private String content;
    private List<Double> embedding;
    private Map<String, Object> metadata;
    private double similarityScore;
}
