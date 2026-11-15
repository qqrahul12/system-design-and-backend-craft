package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for Multi-Turn Chat and Swarm Agent Session persistence.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class SessionSqlQueries {

    private SessionSqlQueries() {}

    public static final String COUNT_SESSIONS =
            "SELECT COUNT(*) FROM chat_sessions";

    public static final String SELECT_ALL_SESSIONS =
            "SELECT session_id, title, session_type, last_active_at, created_at, message_count, summary_text, messages_json " +
            "FROM chat_sessions ORDER BY last_active_at DESC";

    public static final String SELECT_SESSION_BY_ID =
            "SELECT session_id, title, session_type, last_active_at, created_at, message_count, summary_text, messages_json " +
            "FROM chat_sessions WHERE session_id = ?";

    public static final String UPSERT_SESSION = """
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
            """;

    public static final String DELETE_SESSION_BY_ID =
            "DELETE FROM chat_sessions WHERE session_id = ?";
}
