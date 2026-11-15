package com.skills.ai.session;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.concurrent.ConcurrentHashMap;

/**
 * Distributed Service managing user multi-turn sessions, conversation context,
 * and swarm run logs across page reloads and distributed cluster nodes.
 */
@Slf4j
@Service
public class SessionStoreService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Map<String, SessionSummary> fallbackSessions = new ConcurrentHashMap<>();

    public SessionStoreService(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            @Autowired(required = false) ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = (objectMapper != null) ? objectMapper : new ObjectMapper();
        initDatabase();
    }

    private void initDatabase() {
        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        session_id VARCHAR(64) PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        session_type VARCHAR(64) NOT NULL,
                        last_active_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        message_count INT NOT NULL DEFAULT 0,
                        summary_text TEXT,
                        messages_json TEXT
                    )
                """);

                Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM chat_sessions", Integer.class);
                if (count != null && count > 0) {
                    log.info("💬 Found {} persisted chat/swarm sessions in PostgreSQL (SSOT). Zero startup seeding needed.", count);
                    return;
                }
            } catch (Exception e) {
                log.warn("⚠️ Failed to initialize chat_sessions table in PostgreSQL, falling back to local memory: {}", e.getMessage());
            }
        }
        seedInitialSessions();
    }

    public List<SessionSummary> listSessions() {
        if (jdbcTemplate != null) {
            try {
                return jdbcTemplate.query(
                        "SELECT session_id, title, session_type, last_active_at, created_at, message_count, summary_text, messages_json " +
                        "FROM chat_sessions ORDER BY last_active_at DESC",
                        this::mapRowToSession
                );
            } catch (Exception e) {
                log.warn("⚠️ Error listing sessions from PostgreSQL, falling back to local memory: {}", e.getMessage());
            }
        }
        List<SessionSummary> list = new ArrayList<>(fallbackSessions.values());
        list.sort((a, b) -> b.lastActiveAt().compareTo(a.lastActiveAt()));
        return list;
    }

    public Optional<SessionSummary> getSession(String id) {
        if (id == null) return Optional.empty();
        if (jdbcTemplate != null) {
            try {
                List<SessionSummary> results = jdbcTemplate.query(
                        "SELECT session_id, title, session_type, last_active_at, created_at, message_count, summary_text, messages_json " +
                        "FROM chat_sessions WHERE session_id = ?",
                        this::mapRowToSession,
                        id
                );
                if (!results.isEmpty()) {
                    return Optional.of(results.get(0));
                }
                return Optional.empty();
            } catch (Exception e) {
                log.warn("⚠️ Error reading session {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return Optional.ofNullable(fallbackSessions.get(id));
    }

    @Transactional
    public SessionSummary saveSession(SessionSummary summary) {
        if (summary == null) return null;
        if (jdbcTemplate != null) {
            try {
                String json = "[]";
                if (summary.events() != null) {
                    json = objectMapper.writeValueAsString(summary.events());
                }
                jdbcTemplate.update("""
                    INSERT INTO chat_sessions (
                        session_id, title, session_type, last_active_at, created_at, message_count, summary_text, messages_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (session_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        session_type = EXCLUDED.session_type,
                        last_active_at = EXCLUDED.last_active_at,
                        message_count = EXCLUDED.message_count,
                        summary_text = EXCLUDED.summary_text,
                        messages_json = EXCLUDED.messages_json
                """,
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
            }
        }

        fallbackSessions.put(summary.sessionId(), summary);
        log.debug("Saved session to fallback memory: id={}, title={}", summary.sessionId(), summary.title());
        return summary;
    }

    @Transactional
    public boolean deleteSession(String id) {
        if (id == null) return false;
        if (jdbcTemplate != null) {
            try {
                int affected = jdbcTemplate.update("DELETE FROM chat_sessions WHERE session_id = ?", id);
                return affected > 0;
            } catch (Exception e) {
                log.warn("⚠️ Failed to delete session {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return fallbackSessions.remove(id) != null;
    }

    private SessionSummary mapRowToSession(ResultSet rs, int rowNum) throws SQLException {
        String json = rs.getString("messages_json");
        List<Map<String, Object>> events = List.of();
        if (json != null && !json.isBlank()) {
            try {
                events = objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception ignored) {}
        }

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

    private void seedInitialSessions() {
        String s1 = "ses-chat-" + UUID.randomUUID().toString().substring(0, 6);
        saveSession(new SessionSummary(
                s1,
                "IMAX vs Dolby format comparison",
                "CHAT",
                Instant.now().minusSeconds(3600),
                Instant.now().minusSeconds(1800),
                4,
                "Explored aspect ratio differences between 1.43:1 70mm and Dolby Atmos dual 4K laser.",
                List.of(
                        Map.of("role", "user", "text", "What is the difference between IMAX and Dolby?"),
                        Map.of("role", "assistant", "text", "IMAX features a towering 1.43:1 aspect ratio with powerful sub-bass...")
                )
        ));

        String s2 = "ses-swarm-" + UUID.randomUUID().toString().substring(0, 6);
        saveSession(new SessionSummary(
                s2,
                "Inception VIP 2-Seat Swarm Run",
                "SWARM_ORCHESTRATION",
                Instant.now().minusSeconds(7200),
                Instant.now().minusSeconds(7000),
                6,
                "Completed 6-step DAG execution. Applied CINE20 voucher (-$6.00), locked seats B3 & B4.",
                List.of(
                        Map.of("agent", "Supervisor", "action", "Formulated DAG"),
                        Map.of("agent", "Billing", "action", "Payment $24.00 captured")
                )
        ));
    }
}
