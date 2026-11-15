package com.skills.ai.ticket;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skills.ai.persistence.queries.TicketSqlQueries;
import com.skills.ai.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static com.skills.ai.persistence.queries.TicketSqlQueries.*;

/**
 * Enterprise Service Implementation for Digital Pass Management.
 * Follows SOLID principles:
 * - Single Responsibility: Manages ticket records, distributed seat locks, and cluster-wide event pub/sub.
 * - Dependency Inversion: Depends on abstractions (TicketSignatureService, StringRedisTemplate, JdbcTemplate).
 */
@Slf4j
@Service
public class TicketServiceImpl implements TicketService {

    private static final Duration SEAT_LOCK_TTL = Duration.ofSeconds(600);
    private static final String REDIS_ACTIVE_SHOWTIMES_KEY = "cinemind:active_showtimes";

    private final String nodeId = UUID.randomUUID().toString().substring(0, 8);
    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final TicketSignatureService signatureService;
    private final ObjectMapper objectMapper;
    private final Map<String, SeatLock> activeLocks = new ConcurrentHashMap<>();

    private final Sinks.Many<Map<String, Object>> seatEventSink =
            Sinks.many().multicast().onBackpressureBuffer();

    public TicketServiceImpl(
            JdbcTemplate jdbcTemplate,
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            TicketSignatureService signatureService,
            @Autowired(required = false) ObjectMapper objectMapper,
            @Autowired(required = false) RedisMessageListenerContainer listenerContainer,
            @Autowired(required = false) @Qualifier("seatEventsTopic") ChannelTopic seatEventsTopic
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        this.signatureService = signatureService;
        this.objectMapper = (objectMapper != null) ? objectMapper : JsonUtils.getMapper();

        initClusterPubSubListener(listenerContainer, seatEventsTopic);
    }

    private void initClusterPubSubListener(RedisMessageListenerContainer container, ChannelTopic topic) {
        if (container != null && topic != null) {
            try {
                container.addMessageListener((message, pattern) -> {
                    try {
                        String body = new String(message.getBody());
                        Map<String, Object> event = objectMapper.readValue(body, new TypeReference<>() {});
                        String senderNode = (String) event.get("nodeId");
                        // Deduplicate: if event was published by this pod, skip emitting again
                        if (!nodeId.equals(senderNode)) {
                            seatEventSink.tryEmitNext(event);
                            log.debug("[PubSub] Received remote seat event on node {}: {}", nodeId, event.get("event"));
                        }
                    } catch (Exception e) {
                        log.debug("Failed to deserialize cluster seat event: {}", e.getMessage());
                    }
                }, topic);
                log.info("Subscribed node {} to distributed Redis topic: {}", nodeId, topic.getTopic());
            } catch (Exception e) {
                log.warn("Failed to register Redis Pub/Sub listener for seat events: {}", e.getMessage());
            }
        }
    }

    private void broadcastSeatEvent(Map<String, Object> rawEvent) {
        Map<String, Object> eventWithNode = new HashMap<>(rawEvent);
        eventWithNode.put("nodeId", nodeId);
        seatEventSink.tryEmitNext(eventWithNode);

        if (redisTemplate != null) {
            try {
                String json = objectMapper.writeValueAsString(eventWithNode);
                redisTemplate.convertAndSend("cinemind:topic:seats", json);
            } catch (Exception e) {
                log.debug("Redis Pub/Sub broadcast skipped: {}", e.getMessage());
            }
        }
    }

    @Override
    public Flux<Map<String, Object>> getSeatEvents() {
        return seatEventSink.asFlux();
    }

    @Override
    public SeatLock acquireSeatLock(String movieTitle, String showTime, List<String> seats) {
        Instant now = Instant.now();
        activeLocks.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));

        String lockToken = "LOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant expiresAt = now.plusSeconds(600); // 10-minute distributed lock TTL

        SeatLock lock = new SeatLock(lockToken, movieTitle, showTime != null ? showTime : "7:30 PM", seats, expiresAt);
        activeLocks.put(lockToken, lock);

        if (redisTemplate != null) {
            try {
                String safeMovie = movieTitle != null ? movieTitle.replaceAll("\\s+", "_") : "ANY";
                String safeShow = showTime != null ? showTime.replaceAll("\\s+", "_") : "ANY";
                String showtimeSetKey = "cinemind:showtime:locked_seats:" + safeMovie + ":" + safeShow;
                for (String seat : seats) {
                    String seatKey = "cinemind:seatlock:" + safeMovie + ":" + safeShow + ":" + seat;
                    redisTemplate.opsForValue().set(seatKey, lockToken, SEAT_LOCK_TTL);
                    redisTemplate.opsForSet().add(showtimeSetKey, seat);
                }
                redisTemplate.expire(showtimeSetKey, SEAT_LOCK_TTL);
                redisTemplate.opsForSet().add(REDIS_ACTIVE_SHOWTIMES_KEY, showtimeSetKey);
                redisTemplate.expire(REDIS_ACTIVE_SHOWTIMES_KEY, SEAT_LOCK_TTL);
                String tokenKey = "cinemind:lock:" + lockToken;
                redisTemplate.opsForValue().set(tokenKey, safeMovie + "|" + safeShow + "|" + String.join(",", seats), SEAT_LOCK_TTL);
                log.info("Acquired distributed seat lock: token={}, movie={}, seats={}", lockToken, movieTitle, seats);
            } catch (Exception e) {
                log.warn("Failed to write seat lock to Redis (falling back to memory): {}", e.getMessage());
            }
        } else {
            log.info("Acquired local seat lock: token={}, movie={}, seats={}", lockToken, movieTitle, seats);
        }

        broadcastSeatEvent(Map.of(
                "event", "LOCK_ACQUIRED",
                "movieTitle", movieTitle != null ? movieTitle : "",
                "showTime", showTime != null ? showTime : "",
                "seats", seats,
                "lockToken", lockToken,
                "timestamp", Instant.now().toString()
        ));
        return lock;
    }

    @Override
    public boolean releaseSeatLock(String lockToken) {
        SeatLock removed = activeLocks.remove(lockToken);
        String movie = (removed != null) ? removed.movieTitle() : "";
        String show = (removed != null) ? removed.showTime() : "";
        List<String> releasedSeats = (removed != null) ? removed.seats() : List.of();

        if (redisTemplate != null) {
            try {
                String tokenKey = "cinemind:lock:" + lockToken;
                String val = redisTemplate.opsForValue().get(tokenKey);
                if (val != null) {
                    String[] parts = val.split("\\|");
                    if (parts.length >= 3) {
                        movie = parts[0];
                        show = parts[1];
                        releasedSeats = Arrays.asList(parts[2].split(","));
                        String showtimeSetKey = "cinemind:showtime:locked_seats:" + movie + ":" + show;
                        for (String seat : releasedSeats) {
                            redisTemplate.delete("cinemind:seatlock:" + movie + ":" + show + ":" + seat);
                            redisTemplate.opsForSet().remove(showtimeSetKey, seat);
                        }
                        Long remaining = redisTemplate.opsForSet().size(showtimeSetKey);
                        if (remaining == null || remaining == 0) {
                            redisTemplate.delete(showtimeSetKey);
                            redisTemplate.opsForSet().remove(REDIS_ACTIVE_SHOWTIMES_KEY, showtimeSetKey);
                        }
                    }
                    redisTemplate.delete(tokenKey);
                }
            } catch (Exception e) {
                log.warn("Failed to release seat lock in Redis: {}", e.getMessage());
            }
        }

        if (removed != null || !releasedSeats.isEmpty()) {
            log.info("Released seat lock: token={}, seats={}", lockToken, releasedSeats);
            broadcastSeatEvent(Map.of(
                    "event", "LOCK_RELEASED",
                    "movieTitle", movie != null ? movie : "",
                    "showTime", show != null ? show : "",
                    "seats", releasedSeats,
                    "lockToken", lockToken != null ? lockToken : "",
                    "timestamp", Instant.now().toString()
            ));
            return true;
        }
        return false;
    }

    @Override
    public Map<String, Object> getAuditoriumSeats(String movieTitle, String showTime) {
        Instant now = Instant.now();
        activeLocks.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));

        // Get booked seats from active tickets in DB
        Set<String> bookedSeats = new HashSet<>();
        for (DigitalTicket t : listTickets()) {
            if (movieTitle == null || t.movieTitle().equalsIgnoreCase(movieTitle)) {
                if (t.seats() != null) {
                    bookedSeats.addAll(t.seats());
                }
            }
        }

        // Get locked seats from active locks
        Set<String> lockedSeats = new HashSet<>();
        for (SeatLock lock : activeLocks.values()) {
            if (movieTitle == null || lock.movieTitle().equalsIgnoreCase(movieTitle)) {
                lockedSeats.addAll(lock.seats());
            }
        }

        if (redisTemplate != null) {
            try {
                String safeMovie = movieTitle != null ? movieTitle.replaceAll("\\s+", "_") : "ANY";
                String safeShow = showTime != null ? showTime.replaceAll("\\s+", "_") : "ANY";
                if (!"ANY".equals(safeMovie) && !"ANY".equals(safeShow)) {
                    String showtimeSetKey = "cinemind:showtime:locked_seats:" + safeMovie + ":" + safeShow;
                    Set<String> setMembers = redisTemplate.opsForSet().members(showtimeSetKey);
                    if (setMembers != null && !setMembers.isEmpty()) {
                        lockedSeats.addAll(setMembers);
                    }
                } else {
                    // Non-blocking O(1) set member retrieval instead of keys()
                    Set<String> activeShowtimes = redisTemplate.opsForSet().members(REDIS_ACTIVE_SHOWTIMES_KEY);
                    if (activeShowtimes != null) {
                        for (String stKey : activeShowtimes) {
                            Set<String> seats = redisTemplate.opsForSet().members(stKey);
                            if (seats != null) {
                                lockedSeats.addAll(seats);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Redis lookup for locked seats skipped: {}", e.getMessage());
            }
        }

        Map<String, Map<String, Object>> tierCatalog = Map.of(
                "VIP_RECLINER", Map.of(
                        "name", "VIP Heated Leather Recliner",
                        "price", 24.50,
                        "description", "Motorized reclining, heated seat, swivel food tray, Dolby Atmos acoustic focal center",
                        "seats", List.of("C3", "C4", "D3", "D4")
                ),
                "PRIME_RESERVED", Map.of(
                        "name", "Prime Stadium Reserved",
                        "price", 19.50,
                        "description", "Extra legroom, luxury plush rocker, central field of view",
                        "seats", List.of("B3", "B4", "C2", "C5", "D2", "D5")
                ),
                "STANDARD", Map.of(
                        "name", "Standard Stadium",
                        "price", 16.00,
                        "description", "Ergonomic high-back theater seat with cup holder",
                        "seats", List.of("A2", "A3", "A4", "A5", "B2", "B5", "E2", "E3", "E4", "E5")
                ),
                "ACCESSIBLE", Map.of(
                        "name", "Wheelchair & Companion Bay",
                        "price", 16.00,
                        "description", "Step-free flat entrance bay with companion adjacent seating",
                        "seats", List.of("A1", "A6", "E1", "E6")
                )
        );

        return Map.of(
                "movieTitle", movieTitle != null ? movieTitle : "Interstellar",
                "showTime", showTime != null ? showTime : "7:30 PM",
                "totalSeats", 30,
                "rows", List.of("A", "B", "C", "D", "E"),
                "cols", List.of(1, 2, 3, 4, 5, 6),
                "occupiedSeats", new ArrayList<>(bookedSeats),
                "lockedSeats", new ArrayList<>(lockedSeats),
                "tierCatalog", tierCatalog
        );
    }

    @Override
    @Transactional
    public DigitalTicket issueTicket(String movieTitle, String showTime, String format, String auditorium, List<String> seats, double totalPaid) {
        return issueTicket(movieTitle, showTime, format, auditorium, seats, totalPaid, Instant.now());
    }

    @Override
    @Transactional
    public DigitalTicket issueTicket(
            String movieTitle,
            String showTime,
            String format,
            String auditorium,
            List<String> seats,
            double totalPaid,
            Instant issuedAt
    ) {
        String safeTitle = (movieTitle != null && !movieTitle.isBlank()) ? movieTitle : "MOVIE";
        String cleanTitle = safeTitle.replaceAll("[^a-zA-Z]", "").toUpperCase();
        String prefix = cleanTitle.substring(0, Math.min(5, cleanTitle.length()));
        String ticketId = "TKT-" + prefix + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        List<String> safeSeats = (seats != null && !seats.isEmpty()) ? seats : List.of("C3");
        String rawPayload = String.format("%s:%s:%s:%s", ticketId, safeTitle, String.join(",", safeSeats), totalPaid);
        String signature = signatureService.sign(rawPayload);
        Instant issueTime = (issuedAt != null) ? issuedAt : Instant.now();
        String formatVal = (format != null) ? format : "IMAX 70mm";
        String audVal = (auditorium != null) ? auditorium : "Auditorium 1";
        String showTimeVal = (showTime != null) ? showTime : "7:30 PM";

        DigitalTicket ticket = new DigitalTicket(
                ticketId,
                safeTitle,
                showTimeVal,
                formatVal,
                audVal,
                safeSeats,
                totalPaid,
                rawPayload + ":" + signature.substring(0, Math.min(8, signature.length())),
                signature,
                "ISSUED",
                issueTime,
                null
        );

        jdbcTemplate.update(
                INSERT_TICKET,
                ticketId, safeTitle, showTimeVal, formatVal, audVal, String.join(",", safeSeats), totalPaid, ticket.qrPayload(), signature, "ISSUED", Timestamp.from(issueTime)
        );

        log.info("Issued digital ticket in DB: id={}, movie={}, seats={}", ticketId, safeTitle, safeSeats);

        broadcastSeatEvent(Map.of(
                "event", "TICKET_ISSUED",
                "movieTitle", safeTitle,
                "showTime", showTimeVal,
                "seats", safeSeats,
                "ticketId", ticketId,
                "timestamp", issueTime.toString()
        ));
        return ticket;
    }

    @Override
    public Optional<DigitalTicket> getTicket(String ticketId) {
        List<DigitalTicket> results = jdbcTemplate.query(
                SELECT_TICKET_BY_ID,
                this::mapRowToTicket,
                ticketId
        );
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public List<DigitalTicket> listTickets() {
        return jdbcTemplate.query(
                SELECT_ALL_TICKETS,
                this::mapRowToTicket
        );
    }

    @Override
    @Transactional
    public ValidationResult validateGatePass(String ticketId, String qrToken) {
        Optional<DigitalTicket> opt = getTicket(ticketId);
        if (opt.isEmpty()) {
            return new ValidationResult(false, "INVALID_TICKET", "Ticket ID not found in CineMind database.", null);
        }

        DigitalTicket existing = opt.get();
        if ("CHECKED_IN".equals(existing.status())) {
            return new ValidationResult(false, "ALREADY_CHECKED_IN", "Gate fraud alert: ticket was already checked in at " + existing.checkedInAt(), existing);
        }

        String expectedPayload = String.format("%s:%s:%s:%s", existing.ticketId(), existing.movieTitle(), String.join(",", existing.seats()), existing.totalPaid());
        if (!signatureService.verify(expectedPayload, existing.hmacSignature())) {
            return new ValidationResult(false, "SIGNATURE_TAMPERED", "Cryptographic signature mismatch! Ticket is counterfeit.", existing);
        }

        jdbcTemplate.update(
                UPDATE_TICKET_CHECKED_IN,
                ticketId
        );

        DigitalTicket checkedIn = new DigitalTicket(
                existing.ticketId(),
                existing.movieTitle(),
                existing.showTime(),
                existing.format(),
                existing.auditorium(),
                existing.seats(),
                existing.totalPaid(),
                existing.qrPayload(),
                existing.hmacSignature(),
                "CHECKED_IN",
                existing.issuedAt(),
                Instant.now()
        );

        log.info("Ticket successfully checked in at auditorium gate in DB: id={}", ticketId);
        return new ValidationResult(true, "ACCESS_GRANTED", "Welcome to " + checkedIn.auditorium() + "! Enjoy " + checkedIn.movieTitle() + ".", checkedIn);
    }

    @Override
    @Transactional
    public boolean deleteTicket(String ticketId) {
        int rows = jdbcTemplate.update(DELETE_TICKET_BY_ID, ticketId);
        if (rows > 0) {
            log.info("Cancelled/refunded ticket in DB: id={}", ticketId);
            return true;
        }
        return false;
    }

    private DigitalTicket mapRowToTicket(ResultSet rs, int rowNum) throws SQLException {
        String seatsCsv = rs.getString("seats_csv");
        List<String> seats = (seatsCsv != null && !seatsCsv.isBlank())
                ? Arrays.asList(seatsCsv.split(","))
                : List.of();
        Timestamp ts = rs.getTimestamp("issued_at");
        Instant issuedAt = (ts != null) ? ts.toInstant() : Instant.now();

        return new DigitalTicket(
                rs.getString("ticket_id"),
                rs.getString("movie_title"),
                rs.getString("show_time"),
                rs.getString("format"),
                rs.getString("auditorium"),
                seats,
                rs.getDouble("total_paid"),
                rs.getString("qr_payload"),
                rs.getString("signature"),
                rs.getString("status"),
                issuedAt,
                null
        );
    }
}
