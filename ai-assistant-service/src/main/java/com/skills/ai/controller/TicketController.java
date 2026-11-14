package com.skills.ai.controller;

import com.skills.ai.ticket.DigitalTicket;
import com.skills.ai.ticket.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for issuing digital passes and auditorium gate scanning validation.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class TicketController {

    private final TicketService ticketService;

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

    @PostMapping("/issue")
    public DigitalTicket issueTicket(@RequestBody Map<String, Object> req) {
        String movie = (String) req.getOrDefault("movieTitle", "Inception");
        String showTime = (String) req.getOrDefault("showTime", "9:30 PM");
        String format = (String) req.getOrDefault("format", "IMAX 70mm");
        String auditorium = (String) req.getOrDefault("auditorium", "Auditorium 1 (Dolby)");
        List<String> seats = req.containsKey("seats") ? (List<String>) req.get("seats") : List.of("B3", "B4");
        double amount = req.containsKey("totalPaid") ? ((Number) req.get("totalPaid")).doubleValue() : 24.00;

        return ticketService.issueTicket(movie, showTime, format, auditorium, seats, amount);
    }

    @PostMapping("/validate")
    public ResponseEntity<TicketService.ValidationResult> validateGatePass(@RequestBody Map<String, String> req) {
        String ticketId = req.get("ticketId");
        String qrToken = req.get("qrToken");
        TicketService.ValidationResult result = ticketService.validateGatePass(ticketId, qrToken);
        return ResponseEntity.ok(result);
    }
}
