package com.skills.ai.ticket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enterprise Service Implementation for Digital Pass Management.
 * Follows SOLID principles:
 * - Single Responsibility: Manages ticket records and seat locks; delegates signature computation to TicketSignatureService.
 * - Dependency Inversion: Depends on abstractions (TicketSignatureService, StringRedisTemplate, JdbcTemplate).
 */
@Slf4j
@Service
public class TicketServiceImpl implements TicketService {

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final TicketSignatureService signatureService;
    private final Map<String, SeatLock> activeLocks = new ConcurrentHashMap<>();

    private final Sinks.Many<Map<String, Object>> seatEventSink =
            Sinks.many().multicast().onBackpressureBuffer();

    public TicketServiceImpl(
            JdbcTemplate jdbcTemplate,
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            TicketSignatureService signatureService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        this.signatureService = signatureService;
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
                for (String seat : seats) {
                    String seatKey = "cinemind:seatlock:" + safeMovie + ":" + safeShow + ":" + seat;
                    redisTemplate.opsForValue().set(seatKey, lockToken, Duration.ofSeconds(600));
                }
                String tokenKey = "cinemind:lock:" + lockToken;
                redisTemplate.opsForValue().set(tokenKey, safeMovie + "|" + safeShow + "|" + String.join(",", seats), Duration.ofSeconds(600));
                log.info("🔐 Acquired 10-minute distributed Redis seat lock: token={}, movie={}, seats={}", lockToken, movieTitle, seats);
            } catch (Exception e) {
                log.warn("⚠️ Failed to write seat lock to Redis (falling back to memory): {}", e.getMessage());
            }
        } else {
            log.info("🔒 Acquired 10-minute in-memory seat lock: token={}, movie={}, seats={}", lockToken, movieTitle, seats);
        }

        seatEventSink.tryEmitNext(Map.of(
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
        if (redisTemplate != null) {
            try {
                String tokenKey = "cinemind:lock:" + lockToken;
                String val = redisTemplate.opsForValue().get(tokenKey);
                if (val != null) {
                    String[] parts = val.split("\\|");
                    if (parts.length >= 3) {
                        String m = parts[0];
                        String s = parts[1];
                        String[] seatList = parts[2].split(",");
                        for (String seat : seatList) {
                            redisTemplate.delete("cinemind:seatlock:" + m + ":" + s + ":" + seat);
                        }
                    }
                    redisTemplate.delete(tokenKey);
                }
            } catch (Exception e) {
                log.warn("⚠️ Failed to release seat lock in Redis: {}", e.getMessage());
            }
        }
        if (removed != null) {
            log.info("🔓 Released seat lock: token={}, seats={}", lockToken, removed.seats());
            seatEventSink.tryEmitNext(Map.of(
                    "event", "LOCK_RELEASED",
                    "movieTitle", removed.movieTitle() != null ? removed.movieTitle() : "",
                    "showTime", removed.showTime() != null ? removed.showTime() : "",
                    "seats", removed.seats(),
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
                String safeMovie = movieTitle != null ? movieTitle.replaceAll("\\s+", "_") : "*";
                String safeShow = showTime != null ? showTime.replaceAll("\\s+", "_") : "*";
                Set<String> keys = redisTemplate.keys("cinemind:seatlock:" + safeMovie + ":" + safeShow + ":*");
                if (keys != null) {
                    for (String k : keys) {
                        String seat = k.substring(k.lastIndexOf(':') + 1);
                        lockedSeats.add(seat);
                    }
                }
            } catch (Exception e) {
                log.debug("Redis scan for locked seats skipped: {}", e.getMessage());
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
    public DigitalTicket issueTicket(String movieTitle, String showTime, String format, String auditorium, List<String> seats, double totalPaid) {
        return issueTicket(movieTitle, showTime, format, auditorium, seats, totalPaid, Instant.now());
    }

    @Override
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
                "INSERT INTO tickets (ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ticketId, safeTitle, showTimeVal, formatVal, audVal, String.join(",", safeSeats), totalPaid, ticket.qrPayload(), signature, "ISSUED", Timestamp.from(issueTime)
        );

        log.info("Issued digital ticket in DB: id={}, movie={}, seats={}", ticketId, safeTitle, safeSeats);

        seatEventSink.tryEmitNext(Map.of(
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
                "SELECT ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at FROM tickets WHERE ticket_id = ?",
                this::mapRowToTicket,
                ticketId
        );
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public List<DigitalTicket> listTickets() {
        return jdbcTemplate.query(
                "SELECT ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at FROM tickets ORDER BY issued_at DESC",
                this::mapRowToTicket
        );
    }

    @Override
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
                "UPDATE tickets SET status = 'CHECKED_IN' WHERE ticket_id = ?",
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
    public boolean deleteTicket(String ticketId) {
        int rows = jdbcTemplate.update("DELETE FROM tickets WHERE ticket_id = ?", ticketId);
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
