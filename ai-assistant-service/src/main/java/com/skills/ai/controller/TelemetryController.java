package com.skills.ai.controller;

import com.skills.ai.telemetry.TraceCollectorService;
import com.skills.ai.telemetry.TraceRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller exposing OpenTelemetry-compatible traces and waterfall span trees.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class TelemetryController {

    private final TraceCollectorService traceCollector;

    @GetMapping("/traces")
    public List<TraceRecord> listTraces() {
        return traceCollector.listTraces();
    }

    @GetMapping("/traces/{id}")
    public ResponseEntity<TraceRecord> getTrace(@PathVariable String id) {
        return traceCollector.getTrace(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
