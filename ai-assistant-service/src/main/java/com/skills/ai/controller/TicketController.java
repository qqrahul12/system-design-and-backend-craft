package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import com.skills.ai.ticket.DigitalTicket;
import com.skills.ai.ticket.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for issuing digital passes and auditorium gate scanning validation.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final AuthService authService;

    @GetMapping
    public List<DigitalTicket> listTickets() {
        return ticketService.listTickets();
    }

    @GetMapping("/{id}")
    public ResponseEntity<DigitalTicket> getTicket(@PathVariable String id) {
        return ticketService.getTicket(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/seats")
    public ResponseEntity<Map<String, Object>> getAuditoriumSeats(
            @RequestParam(required = false) String movie,
            @RequestParam(required = false) String showtime
    ) {
        return ResponseEntity.ok(ticketService.getAuditoriumSeats(movie, showtime));
    }

    @GetMapping(value = "/seats/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> streamSeatEvents() {
        return ticketService.getSeatEvents()
                .map(data -> ServerSentEvent.<Map<String, Object>>builder()
                        .event("seat-update")
                        .data(data)
                        .build());
    }

    @PostMapping("/lock")
    public ResponseEntity<TicketService.SeatLock> acquireSeatLock(@RequestBody Map<String, Object> req) {
        String movie = (String) req.getOrDefault("movieTitle", "Interstellar");
        String showtime = (String) req.getOrDefault("showTime", "7:30 PM");
        @SuppressWarnings("unchecked")
        List<String> seats = req.containsKey("seats") ? (List<String>) req.get("seats") : List.of("B3", "B4");
        return ResponseEntity.ok(ticketService.acquireSeatLock(movie, showtime, seats));
    }

    @PostMapping("/unlock")
    public ResponseEntity<Map<String, Object>> releaseSeatLock(@RequestBody Map<String, String> req) {
        String lockToken = req.get("lockToken");
        boolean released = ticketService.releaseSeatLock(lockToken);
        return ResponseEntity.ok(Map.of("released", released, "lockToken", lockToken != null ? lockToken : ""));
    }

    @PostMapping("/issue")
    public DigitalTicket issueTicket(@RequestBody Map<String, Object> req) {
        String movie = (String) req.getOrDefault("movieTitle", "Inception");
        String showTime = (String) req.getOrDefault("showTime", "9:30 PM");
        String format = (String) req.getOrDefault("format", "IMAX 70mm");
        String auditorium = (String) req.getOrDefault("auditorium", "Auditorium 1 (Dolby)");
        List<String> seats = req.containsKey("seats") ? (List<String>) req.get("seats") : List.of("B3", "B4");
        double amount = req.containsKey("totalPaid") ? ((Number) req.get("totalPaid")).doubleValue() : 24.00;
        java.time.Instant issuedAt = null;
        if (req.containsKey("issuedAt") && req.get("issuedAt") != null) {
            try {
                issuedAt = java.time.Instant.parse(req.get("issuedAt").toString());
            } catch (Exception ignored) {}
        }

        return ticketService.issueTicket(movie, showTime, format, auditorium, seats, amount, issuedAt);
    }

    @PostMapping("/validate")
    public ResponseEntity<TicketService.ValidationResult> validateGatePass(@RequestBody Map<String, String> req) {
        authService.requirePermission("SCAN_GATE_PASS");
        String ticketId = req.get("ticketId");
        String qrToken = req.get("qrToken");
        TicketService.ValidationResult result = ticketService.validateGatePass(ticketId, qrToken);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> cancelTicket(@PathVariable String id) {
        boolean removed = ticketService.deleteTicket(id);
        if (removed) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Reservation cancelled and refunded"));
        }
        return ResponseEntity.notFound().build();
    }
}
