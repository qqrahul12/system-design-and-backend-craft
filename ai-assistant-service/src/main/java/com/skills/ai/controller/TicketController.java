package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentGatewayAdapter;
import com.skills.ai.patterns.adapter.PaymentResult;
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
import java.util.Optional;

/**
 * REST Controller for issuing digital passes and auditorium gate scanning validation.
 * Uses PaymentAdapterRegistry (Adapter / Strategy Pattern) to polymorphically authorize payments
 * without hardcoding payment method branches or coupling to specific wallet services.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final AuthService authService;
    private final PaymentAdapterRegistry paymentAdapterRegistry;

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

        String paymentMethod = (String) req.getOrDefault("paymentMethod", "");
        if (paymentMethod != null && !paymentMethod.isBlank() && amount > 0 && paymentAdapterRegistry != null) {
            PaymentGatewayAdapter adapter = paymentAdapterRegistry.getAdapter(paymentMethod);
            PaymentResult payment = adapter.processPayment(movie, amount, "Theatrical pass: " + movie + " (" + String.join(", ", seats) + ")");
            if (!payment.success()) {
                throw new IllegalStateException("Payment authorization failed: " + payment.message());
            }
            try {
                return ticketService.issueTicket(movie, showTime, format, auditorium, seats, amount, issuedAt);
            } catch (Exception e) {
                adapter.refundPayment(payment.transactionId(), amount, "Automated rollback: ticket issuance failed for " + movie);
                throw e;
            }
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
        Optional<DigitalTicket> ticketOpt = ticketService.getTicket(id);
        if (ticketOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DigitalTicket ticket = ticketOpt.get();
        boolean removed = ticketService.deleteTicket(id);
        if (removed) {
            if (paymentAdapterRegistry != null && ticket.totalPaid() > 0) {
                PaymentGatewayAdapter adapter = paymentAdapterRegistry.getAdapter("WALLET");
                adapter.refundPayment(id, ticket.totalPaid(), "Automated refund for cancelled pass " + id);
            }
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "refundedAmount", ticket.totalPaid(),
                    "message", "Reservation cancelled and $" + ticket.totalPaid() + " refunded to CineCash wallet"
            ));
        }
        return ResponseEntity.notFound().build();
    }
}
