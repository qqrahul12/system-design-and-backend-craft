package com.skills.ai.ticket;

import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service Contract for CineMind Digital Ticketing & Distributed Seat Reservations.
 * Conforms to Interface Segregation Principle (ISP) and Dependency Inversion Principle (DIP).
 */
public interface TicketService {

    record SeatLock(String lockToken, String movieTitle, String showTime, List<String> seats, Instant expiresAt) {}

    record ValidationResult(boolean valid, String code, String message, DigitalTicket ticket) {}

    Flux<Map<String, Object>> getSeatEvents();

    SeatLock acquireSeatLock(String movieTitle, String showTime, List<String> seats);

    boolean releaseSeatLock(String lockToken);

    Map<String, Object> getAuditoriumSeats(String movieTitle, String showTime);

    DigitalTicket issueTicket(String movieTitle, String showTime, String format, String auditorium, List<String> seats, double totalPaid);

    DigitalTicket issueTicket(String movieTitle, String showTime, String format, String auditorium, List<String> seats, double totalPaid, Instant issuedAt);

    Optional<DigitalTicket> getTicket(String ticketId);

    List<DigitalTicket> listTickets();

    ValidationResult validateGatePass(String ticketId, String qrToken);

    boolean deleteTicket(String ticketId);
}
