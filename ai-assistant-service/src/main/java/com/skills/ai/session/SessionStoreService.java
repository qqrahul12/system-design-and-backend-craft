package com.skills.ai.session;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing user multi-turn sessions, conversation context,
 * and swarm run logs across page reloads.
 */
@Slf4j
@Service
public class SessionStoreService {

    private final Map<String, SessionSummary> sessions = new ConcurrentHashMap<>();

    public SessionStoreService() {
        seedInitialSessions();
    }

    public List<SessionSummary> listSessions() {
        List<SessionSummary> list = new ArrayList<>(sessions.values());
        list.sort((a, b) -> b.lastActiveAt().compareTo(a.lastActiveAt()));
        return list;
    }

    public Optional<SessionSummary> getSession(String id) {
        return Optional.ofNullable(sessions.get(id));
    }

    public SessionSummary saveSession(SessionSummary summary) {
        sessions.put(summary.sessionId(), summary);
        log.debug("Saved session: id={}, title={}", summary.sessionId(), summary.title());
        return summary;
    }

    public boolean deleteSession(String id) {
        return sessions.remove(id) != null;
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
