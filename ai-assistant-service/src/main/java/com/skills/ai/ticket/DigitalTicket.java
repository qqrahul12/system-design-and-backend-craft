package com.skills.ai.ticket;

import java.time.Instant;
import java.util.List;

/**
 * Encapsulates a digital CineMind movie pass with cryptographic HMAC-SHA256 gate token.
 */
public record DigitalTicket(
        String ticketId,
        String movieTitle,
        String showTime,
        String format, // IMAX 70mm, Dolby Cinema, 3D
        String auditorium,
        List<String> seats,
        double totalPaid,
        String qrPayload,
        String hmacSignature,
        String status, // ISSUED, CHECKED_IN, EXPIRED
        Instant issuedAt,
        Instant checkedInAt
) {}
