package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import com.skills.ai.rag.RagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller exposing Document Ingestion & RAG Query endpoints.
 * Ingestion is restricted to patrons with RAG_INGESTION clearance.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;
    private final AuthService authService;

    public record IngestRequest(String title, String content, int chunkSize) {}
    public record QueryRequest(String question, int topK) {}

    /**
     * Ingest and index a new document into the Vector Store.
     * {@code POST /api/v1/rag/ingest}
     */
    @PostMapping("/ingest")
    public ResponseEntity<Map<String, Object>> ingest(@RequestBody IngestRequest request) {
        authService.requirePermission("RAG_INGESTION");
        log.info("REST request to ingest document: title={}", request.title());
        int chunksIndexed = ragService.ingestDocument(request.title(), request.content(), request.chunkSize());
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Document successfully ingested and indexed into vector store",
                "title", request.title(),
                "chunksIndexed", chunksIndexed
        ));
    }

    /**
     * Query the RAG knowledge base.
     * {@code POST /api/v1/rag/query}
     */
    @PostMapping("/query")
    public ResponseEntity<RagService.RagResponse> query(@RequestBody QueryRequest request) {
        log.info("REST request for RAG query: question={}", request.question());
        RagService.RagResponse response = ragService.query(request.question(), request.topK());
        return ResponseEntity.ok(response);
    }
}
