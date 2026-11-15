package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import com.skills.ai.concessions.ConcessionCombo;
import com.skills.ai.concessions.ConcessionItem;
import com.skills.ai.concessions.ConcessionOrder;
import com.skills.ai.concessions.ConcessionsService;
import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentGatewayAdapter;
import com.skills.ai.patterns.adapter.PaymentResult;
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
 * Uses PaymentAdapterRegistry (Adapter / Strategy Pattern) to polymorphically authorize payments
 * without hardcoding payment method branches or coupling to specific wallet services.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/concessions")
@RequiredArgsConstructor
public class ConcessionsController {

    private final ConcessionsService concessionsService;
    private final PaymentAdapterRegistry paymentAdapterRegistry;
    private final AuthService authService;

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
        java.time.Instant createdAt = null;
        if (req.containsKey("createdAt") && req.get("createdAt") != null) {
            try {
                createdAt = java.time.Instant.parse(req.get("createdAt").toString());
            } catch (Exception ignored) {}
        }

        String paymentMethod = (String) req.getOrDefault("paymentMethod", "");
        if (paymentMethod != null && !paymentMethod.isBlank() && total > 0 && paymentAdapterRegistry != null) {
            PaymentGatewayAdapter adapter = paymentAdapterRegistry.getAdapter(paymentMethod);
            PaymentResult payment = adapter.processPayment(deliverySeat, total, "Gourmet Concessions Order: " + deliverySeat);
            if (!payment.success()) {
                throw new IllegalStateException("Payment authorization failed: " + payment.message());
            }
            try {
                ConcessionOrder order = concessionsService.placeOrder(items, deliverySeat, total, createdAt);
                return ResponseEntity.status(HttpStatus.CREATED).body(order);
            } catch (Exception e) {
                adapter.refundPayment(payment.transactionId(), total, "Automated rollback: kitchen order submission failed");
                throw e;
            }
        }

        ConcessionOrder order = concessionsService.placeOrder(items, deliverySeat, total, createdAt);
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

    @PostMapping("/items")
    public ResponseEntity<ConcessionItem> createItem(@RequestBody ConcessionItem item) {
        authService.requirePermission("MANAGE_FNB_MENU");
        return ResponseEntity.status(HttpStatus.CREATED).body(concessionsService.saveItem(item));
    }

    @PostMapping({"/seed", "/items/batch"})
    public ResponseEntity<List<ConcessionItem>> seedItems(@RequestBody List<ConcessionItem> items) {
        authService.requirePermission("MANAGE_FNB_MENU");
        return ResponseEntity.status(HttpStatus.CREATED).body(concessionsService.saveItems(items));
    }

    @PatchMapping("/items/{id}/stock")
    public ResponseEntity<ConcessionItem> toggleStock(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        authService.requirePermission("MANAGE_FNB_MENU");
        boolean inStock = body != null && body.getOrDefault("inStock", true);
        return concessionsService.toggleStock(id, inStock)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable String id) {
        authService.requirePermission("MANAGE_FNB_MENU");
        boolean deleted = concessionsService.deleteItem(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
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
