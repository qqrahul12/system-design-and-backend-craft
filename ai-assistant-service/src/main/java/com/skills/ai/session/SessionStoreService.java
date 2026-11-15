package com.skills.ai.session;

import com.skills.ai.persistence.queries.SessionSqlQueries;
import com.skills.ai.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

import static com.skills.ai.persistence.queries.SessionSqlQueries.*;

/**
 * Distributed Service managing user multi-turn sessions, conversation context,
 * and swarm run logs across page reloads and distributed cluster nodes.
 * Follows Single Responsibility Principle (SRP) by delegating SQL persistence definitions
 * to SessionSqlQueries and JSON processing to JsonUtils.
 * Authoritative Single Source of Truth in PostgreSQL with zero in-memory fallback collections or hardcoded seeds.
 */
@Slf4j
@Service
public class SessionStoreService {

    private final JdbcTemplate jdbcTemplate;

    public SessionStoreService(
            @Autowired(required = false) JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
        initDatabase();
    }

    private void initDatabase() {
        if (jdbcTemplate != null) {
            try {
                Integer count = jdbcTemplate.queryForObject(COUNT_SESSIONS, Integer.class);
                log.info("💬 Found {} persisted chat/swarm sessions in PostgreSQL (SSOT). Zero startup seeding needed.", count != null ? count : 0);
            } catch (Exception e) {
                log.warn("⚠️ Failed to check chat_sessions table in PostgreSQL: {}", e.getMessage());
            }
        }
    }

    public List<SessionSummary> listSessions() {
        if (jdbcTemplate == null) {
            return Collections.emptyList();
        }
        try {
            return jdbcTemplate.query(
                    SELECT_ALL_SESSIONS,
                    this::mapRowToSession
            );
        } catch (Exception e) {
            log.warn("⚠️ Error listing sessions from PostgreSQL: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public Optional<SessionSummary> getSession(String id) {
        if (id == null || jdbcTemplate == null) return Optional.empty();
        try {
            List<SessionSummary> results = jdbcTemplate.query(
                    SELECT_SESSION_BY_ID,
                    this::mapRowToSession,
                    id
            );
            if (!results.isEmpty()) {
                return Optional.of(results.get(0));
            }
        } catch (Exception e) {
            log.warn("⚠️ Error reading session {} from PostgreSQL: {}", id, e.getMessage());
        }
        return Optional.empty();
    }

    @Transactional
    public SessionSummary saveSession(SessionSummary summary) {
        if (summary == null || jdbcTemplate == null) return summary;
        try {
            String json = JsonUtils.toJsonOrFallback(summary.events(), "[]");
            jdbcTemplate.update(
                    UPSERT_SESSION,
                    summary.sessionId(),
                    summary.title(),
                    summary.type() != null ? summary.type() : "CHAT",
                    Timestamp.from(summary.lastActiveAt() != null ? summary.lastActiveAt() : Instant.now()),
                    Timestamp.from(summary.createdAt() != null ? summary.createdAt() : Instant.now()),
                    summary.interactionCount(),
                    summary.lastPreview(),
                    json
            );
            log.debug("💾 Saved session to PostgreSQL (SSOT): id={}, title={}", summary.sessionId(), summary.title());
            return summary;
        } catch (Exception e) {
            log.warn("⚠️ Error saving session to PostgreSQL: {}", e.getMessage());
            return summary;
        }
    }

    @Transactional
    public boolean deleteSession(String id) {
        if (id == null || jdbcTemplate == null) return false;
        try {
            int affected = jdbcTemplate.update(DELETE_SESSION_BY_ID, id);
            return affected > 0;
        } catch (Exception e) {
            log.warn("⚠️ Failed to delete session {} from PostgreSQL: {}", id, e.getMessage());
            return false;
        }
    }

    private SessionSummary mapRowToSession(ResultSet rs, int rowNum) throws SQLException {
        String json = rs.getString("messages_json");
        List<Map<String, Object>> events = JsonUtils.fromJsonListOfMaps(json);

        return new SessionSummary(
                rs.getString("session_id"),
                rs.getString("title"),
                rs.getString("session_type"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("last_active_at").toInstant(),
                rs.getInt("message_count"),
                rs.getString("summary_text"),
                events
        );
    }
}
