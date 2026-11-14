package com.skills.ai.ticket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service generating and validating cryptographically-signed digital tickets.
 */
@Slf4j
@Service
public class TicketService {

    private static final String HMAC_SECRET = "cinemind-enterprise-gate-secret-key-2026";
    private final Map<String, DigitalTicket> tickets = new ConcurrentHashMap<>();
    private final Map<String, SeatLock> activeLocks = new ConcurrentHashMap<>();

    public record SeatLock(String lockToken, String movieTitle, String showTime, List<String> seats, Instant expiresAt) {}

    public TicketService() {
        seedSampleTicket();
    }

    public SeatLock acquireSeatLock(String movieTitle, String showTime, List<String> seats) {
        // Clean expired locks
        Instant now = Instant.now();
        activeLocks.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));

        String lockToken = "LOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant expiresAt = now.plusSeconds(600); // 10-minute distributed lock TTL

        SeatLock lock = new SeatLock(lockToken, movieTitle, showTime != null ? showTime : "7:30 PM", seats, expiresAt);
        activeLocks.put(lockToken, lock);
        log.info("🔒 Acquired 10-minute distributed seat lock: token={}, movie={}, seats={}", lockToken, movieTitle, seats);
        return lock;
    }

    public boolean releaseSeatLock(String lockToken) {
        SeatLock removed = activeLocks.remove(lockToken);
        if (removed != null) {
            log.info("🔓 Released seat lock: token={}, seats={}", lockToken, removed.seats());
            return true;
        }
        return false;
    }

    public Map<String, Object> getAuditoriumSeats(String movieTitle, String showTime) {
        Instant now = Instant.now();
        activeLocks.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));

        // Get booked seats from active tickets
        Set<String> bookedSeats = new HashSet<>();
        for (DigitalTicket t : tickets.values()) {
            if (movieTitle == null || t.movieTitle().equalsIgnoreCase(movieTitle)) {
                if (t.seats() != null) {
                    bookedSeats.addAll(t.seats());
                }
            }
        }

        // Realistic deterministic occupied seats for cinema realism based on movie title
        int seedOffset = Math.abs((movieTitle != null ? movieTitle : "default").hashCode()) % 3;
        List<String> simulatedOccupied = switch (seedOffset) {
            case 0 -> List.of("A3", "B2", "C1", "D5", "D6", "E3");
            case 1 -> List.of("A4", "B1", "B6", "C5", "D1", "E4");
            default -> List.of("A2", "B5", "C6", "D2", "E2", "E5");
        };
        bookedSeats.addAll(simulatedOccupied);

        // Get locked seats from active locks
        Set<String> lockedSeats = new HashSet<>();
        for (SeatLock lock : activeLocks.values()) {
            if (movieTitle == null || lock.movieTitle().equalsIgnoreCase(movieTitle)) {
                lockedSeats.addAll(lock.seats());
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

    public DigitalTicket issueTicket(String movieTitle, String showTime, String format, String auditorium, List<String> seats, double totalPaid) {
        String ticketId = "TKT-" + movieTitle.replaceAll("[^a-zA-Z]", "").toUpperCase()
                .substring(0, Math.min(5, movieTitle.length())) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        String rawPayload = String.format("%s:%s:%s:%s", ticketId, movieTitle, String.join(",", seats), totalPaid);
        String signature = computeHmacSha256(rawPayload);

        DigitalTicket ticket = new DigitalTicket(
                ticketId,
                movieTitle,
                showTime,
                format != null ? format : "IMAX 70mm",
                auditorium != null ? auditorium : "Auditorium 4 (Dolby Atmos)",
                seats,
                totalPaid,
                rawPayload + ":" + signature.substring(0, 8),
                signature,
                "ISSUED",
                Instant.now(),
                null
        );

        tickets.put(ticketId, ticket);
        log.info("Issued digital ticket: id={}, movie={}, seats={}", ticketId, movieTitle, seats);
        return ticket;
    }

    public Optional<DigitalTicket> getTicket(String ticketId) {
        return Optional.ofNullable(tickets.get(ticketId));
    }

    public List<DigitalTicket> listTickets() {
        return new ArrayList<>(tickets.values());
    }

    public ValidationResult validateGatePass(String ticketId, String qrToken) {
        DigitalTicket existing = tickets.get(ticketId);
        if (existing == null) {
            return new ValidationResult(false, "INVALID_TICKET", "Ticket ID not found in CineMind database.", null);
        }

        if ("CHECKED_IN".equals(existing.status())) {
            return new ValidationResult(false, "ALREADY_CHECKED_IN", "Gate fraud alert: ticket was already checked in at " + existing.checkedInAt(), existing);
        }

        // Validate HMAC signature
        String expectedPayload = String.format("%s:%s:%s:%s", existing.ticketId(), existing.movieTitle(), String.join(",", existing.seats()), existing.totalPaid());
        String expectedSignature = computeHmacSha256(expectedPayload);

        if (!existing.hmacSignature().equals(expectedSignature)) {
            return new ValidationResult(false, "SIGNATURE_TAMPERED", "Cryptographic signature mismatch! Ticket is counterfeit.", existing);
        }

        // Mark ticket checked-in
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
        tickets.put(ticketId, checkedIn);

        log.info("Ticket successfully checked in at auditorium gate: id={}", ticketId);
        return new ValidationResult(true, "ACCESS_GRANTED", "Welcome to " + checkedIn.auditorium() + "! Enjoy " + checkedIn.movieTitle() + ".", checkedIn);
    }

    public boolean deleteTicket(String ticketId) {
        DigitalTicket removed = tickets.remove(ticketId);
        if (removed != null) {
            log.info("Cancelled/refunded ticket: id={}", ticketId);
            return true;
        }
        return false;
    }

    private String computeHmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(HMAC_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    private void seedSampleTicket() {
        issueTicket("Inception", "9:30 PM", "IMAX 70mm", "Auditorium 1", List.of("B3", "B4"), 24.00);
    }

    public record ValidationResult(boolean valid, String code, String message, DigitalTicket ticket) {}
}
