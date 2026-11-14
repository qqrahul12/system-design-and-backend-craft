package com.skills.ai.controller;

import com.skills.ai.concessions.ConcessionCombo;
import com.skills.ai.concessions.ConcessionItem;
import com.skills.ai.concessions.ConcessionOrder;
import com.skills.ai.concessions.ConcessionsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing CineMind Gourmet F&B Menu, AI pairings, and live ordering.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/concessions")
@RequiredArgsConstructor
public class ConcessionsController {

    private final ConcessionsService concessionsService;

    @GetMapping("/menu")
    public List<ConcessionItem> getMenu() {
        return concessionsService.getMenu();
    }

    @PostMapping("/recommend")
    public List<ConcessionCombo> recommendCombos(@RequestBody(required = false) Map<String, Object> body) {
        String genre = body != null && body.containsKey("genre") ? (String) body.get("genre") : "Sci-Fi";
        int partySize = body != null && body.containsKey("partySize") ? ((Number) body.get("partySize")).intValue() : 2;
        return concessionsService.recommendCombos(genre, partySize);
    }

    @PostMapping("/order")
    public ResponseEntity<ConcessionOrder> placeOrder(@RequestBody Map<String, Object> req) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) req.getOrDefault("items", List.of());
        String deliverySeat = (String) req.getOrDefault("deliverySeat", "Express VIP Counter");
        double total = req.containsKey("total") ? ((Number) req.get("total")).doubleValue() : 18.50;

        ConcessionOrder order = concessionsService.placeOrder(items, deliverySeat, total);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @GetMapping("/orders")
    public List<ConcessionOrder> listOrders() {
        return concessionsService.listOrders();
    }

    @PostMapping("/orders/{orderId}/status")
    public ResponseEntity<ConcessionOrder> updateOrderStatus(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body) {
        String status = body != null ? body.getOrDefault("status", "PLATED") : "PLATED";
        return concessionsService.updateOrderStatus(orderId, status)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/orders/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<ConcessionOrder>> streamOrderEvents() {
        return concessionsService.getOrderEvents()
                .map(order -> ServerSentEvent.<ConcessionOrder>builder()
                        .event("order-update")
                        .data(order)
                        .build());
    }
}
