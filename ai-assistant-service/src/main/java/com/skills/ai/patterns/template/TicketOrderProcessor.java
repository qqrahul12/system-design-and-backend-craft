package com.skills.ai.patterns.template;

import com.skills.ai.patterns.adapter.PaymentAdapterRegistry;
import com.skills.ai.patterns.adapter.PaymentResult;
import com.skills.ai.ticket.DigitalTicket;
import com.skills.ai.ticket.TicketService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Template Method Pattern Concrete Subclass:
 * Implements movie ticket booking with distributed seat locks, HMAC pass issuance, and SSE notifications.
 */
@Slf4j
@Service
public class TicketOrderProcessor extends OrderProcessingTemplate<TicketOrderProcessor.TicketBookingRequest, DigitalTicket> {

    private final TicketService ticketService;

    public record TicketBookingRequest(
            String movieTitle,
            String showTime,
            String format,
            String auditorium,
            List<String> seats,
            double basePrice
    ) {}

    public TicketOrderProcessor(PaymentAdapterRegistry adapterRegistry, TicketService ticketService) {
        super(adapterRegistry.getAdapter("WALLET"));
        this.ticketService = ticketService;
    }

    @Override
    protected String generateOrderReference(TicketBookingRequest request) {
        return "BKG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    protected void validateRequest(TicketBookingRequest request) {
        if (request.seats() == null || request.seats().isEmpty()) {
            throw new IllegalArgumentException("Booking must include at least 1 selected seat");
        }
        if (request.movieTitle() == null || request.movieTitle().isBlank()) {
            throw new IllegalArgumentException("Movie title is required");
        }
    }

    @Override
    protected String acquireResourceLock(TicketBookingRequest request) {
        TicketService.SeatLock lock = ticketService.acquireSeatLock(request.movieTitle(), request.showTime(), request.seats());
        return lock.lockToken();
    }

    @Override
    protected double calculatePricing(TicketBookingRequest request) {
        double multiplier = request.format() != null && request.format().toUpperCase().contains("IMAX") ? 1.25 : 1.0;
        return Math.round(request.basePrice() * multiplier * 100.0) / 100.0;
    }

    @Override
    protected String getPaymentDescription(TicketBookingRequest request) {
        return String.format("%s (%s) Seats: %s", request.movieTitle(), request.format(), String.join(", ", request.seats()));
    }

    @Override
    protected DigitalTicket generateArtifact(TicketBookingRequest request, PaymentResult payment, String lockToken) {
        DigitalTicket dt = ticketService.issueTicket(
                request.movieTitle(),
                request.showTime(),
                request.format(),
                request.auditorium(),
                request.seats(),
                payment.amount()
        );
        if (lockToken != null) {
            ticketService.releaseSeatLock(lockToken);
        }
        return dt;
    }

    @Override
    protected void publishLifecycleEvent(DigitalTicket artifact) {
        log.info("[TicketOrderProcessor] Published lifecycle event for ticket: {}", artifact.ticketId());
    }

    @Override
    protected void onFailureRollback(TicketBookingRequest request, String lockToken, Exception error) {
        if (lockToken != null) {
            ticketService.releaseSeatLock(lockToken);
            log.info("[TicketOrderProcessor] Released distributed seat lock due to order failure: token={}", lockToken);
        }
    }
}
