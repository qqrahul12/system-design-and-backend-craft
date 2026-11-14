package com.skills.ai.patterns.template;

import com.skills.ai.concessions.ConcessionOrder;
import com.skills.ai.concessions.ConcessionsService;
import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Template Method Pattern Concrete Subclass:
 * Implements gourmet concessions kitchen ordering with seat dispatch and live status updates.
 */
@Slf4j
@Service
public class ConcessionOrderProcessor extends OrderProcessingTemplate<ConcessionOrderProcessor.ConcessionOrderRequest, ConcessionOrder> {

    private final ConcessionsService concessionsService;

    public record ConcessionOrderRequest(
            List<Map<String, Object>> items,
            String deliverySeat,
            double total
    ) {}

    public ConcessionOrderProcessor(PaymentAdapterRegistry adapterRegistry, ConcessionsService concessionsService) {
        super(adapterRegistry.getAdapter("WALLET"));
        this.concessionsService = concessionsService;
    }

    @Override
    protected String generateOrderReference(ConcessionOrderRequest request) {
        return "FNB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    protected void validateRequest(ConcessionOrderRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Concession order must include at least 1 menu item");
        }
        if (request.deliverySeat() == null || request.deliverySeat().isBlank()) {
            throw new IllegalArgumentException("Seat destination or pickup counter is required");
        }
    }

    @Override
    protected String acquireResourceLock(ConcessionOrderRequest request) {
        // Concessions verify kitchen queue capacity; no physical seat hold required
        return "KITCHEN-QUEUE-" + UUID.randomUUID().toString().substring(0, 6);
    }

    @Override
    protected double calculatePricing(ConcessionOrderRequest request) {
        double tax = Math.round(request.total() * 0.08 * 100.0) / 100.0;
        return Math.round((request.total() + tax) * 100.0) / 100.0;
    }

    @Override
    protected String getPaymentDescription(ConcessionOrderRequest request) {
        return String.format("Gourmet Concessions (%d items to %s)", request.items().size(), request.deliverySeat());
    }

    @Override
    protected ConcessionOrder generateArtifact(ConcessionOrderRequest request, PaymentResult payment, String lockToken) {
        return concessionsService.placeOrder(request.items(), request.deliverySeat(), payment.amount());
    }

    @Override
    protected void publishLifecycleEvent(ConcessionOrder artifact) {
        log.info("🍿 [ConcessionOrderProcessor] Kitchen order dispatched: id={}, seat={}", artifact.orderId(), artifact.deliverySeat());
    }
}
