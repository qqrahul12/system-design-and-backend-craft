package com.skills.ai.controller;

import com.skills.ai.session.SessionStoreService;
import com.skills.ai.session.SessionSummary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing user conversational and multi-agent swarm sessions.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SessionController {

    private final SessionStoreService sessionStore;

    @GetMapping
    public List<SessionSummary> listSessions() {
        return sessionStore.listSessions();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionSummary> getSession(@PathVariable String id) {
        return sessionStore.getSession(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SessionSummary saveSession(@RequestBody SessionSummary summary) {
        return sessionStore.saveSession(summary);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable String id) {
        boolean removed = sessionStore.deleteSession(id);
        return removed ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
