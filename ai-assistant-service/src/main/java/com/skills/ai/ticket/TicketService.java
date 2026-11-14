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

    public TicketService() {
        seedSampleTicket();
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
