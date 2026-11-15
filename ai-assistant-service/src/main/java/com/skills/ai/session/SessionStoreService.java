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
import java.util.concurrent.ConcurrentHashMap;

import static com.skills.ai.persistence.queries.SessionSqlQueries.*;

/**
 * Distributed Service managing user multi-turn sessions, conversation context,
 * and swarm run logs across page reloads and distributed cluster nodes.
 * Follows Single Responsibility Principle (SRP) by delegating SQL persistence definitions
 * to SessionSqlQueries and JSON processing to JsonUtils.
 */
@Slf4j
@Service
public class SessionStoreService {

    private final JdbcTemplate jdbcTemplate;
    private final Map<String, SessionSummary> fallbackSessions = new ConcurrentHashMap<>();

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
                if (count != null && count > 0) {
                    log.info("💬 Found {} persisted chat/swarm sessions in PostgreSQL (SSOT). Zero startup seeding needed.", count);
                    return;
                }
            } catch (Exception e) {
                log.warn("⚠️ Failed to check chat_sessions table in PostgreSQL, falling back to local memory: {}", e.getMessage());
            }
        }
        seedInitialSessions();
    }

    public List<SessionSummary> listSessions() {
        if (jdbcTemplate != null) {
            try {
                return jdbcTemplate.query(
                        SELECT_ALL_SESSIONS,
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
                        SELECT_SESSION_BY_ID,
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
                int affected = jdbcTemplate.update(DELETE_SESSION_BY_ID, id);
                return affected > 0;
            } catch (Exception e) {
                log.warn("⚠️ Failed to delete session {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return fallbackSessions.remove(id) != null;
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
