package com.skills.ai.concessions;

import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Interface contract for CineMind Gourmet Concessions, dietary validation,
 * sensory genre pairings, and food & beverage order lifecycle.
 * Adheres to Dependency Inversion (DIP) and Interface Segregation (ISP).
 */
public interface ConcessionsService {

    /**
     * Real-time reactive stream of concession preparation & delivery events.
     */
    Flux<ConcessionOrder> getOrderEvents();

    /**
     * Lists current culinary menu offerings.
     */
    List<ConcessionItem> getMenu();

    /**
     * Finds a menu item by identifier.
     */
    Optional<ConcessionItem> getItem(String id);

    /**
     * AI-curated combo recommendations based on movie genre and party size.
     */
    List<ConcessionCombo> recommendCombos(String movieGenre, int partySize);

    /**
     * Places a concessions order for in-auditorium seat delivery or counter pickup.
     */
    ConcessionOrder placeOrder(List<Map<String, Object>> items, String deliverySeat, double total);

    /**
     * Places a concessions order with explicit creation timestamp.
     */
    ConcessionOrder placeOrder(List<Map<String, Object>> items, String deliverySeat, double total, Instant createdAt);

    /**
     * Advances concession kitchen status (PREPARING -> PLATED -> DELIVERED).
     */
    Optional<ConcessionOrder> updateOrderStatus(String orderId, String newStatus);

    /**
     * Lists all recent concessions orders ordered chronologically.
     */
    List<ConcessionOrder> listOrders();

    /**
     * Creates or updates a concession item in PostgreSQL.
     */
    ConcessionItem saveItem(ConcessionItem item);

    /**
     * Batch creates or updates concession items via administrative API.
     */
    List<ConcessionItem> saveItems(List<ConcessionItem> items);

    /**
     * Toggles stock availability (in stock vs sold out).
     */
    Optional<ConcessionItem> toggleStock(String itemId, boolean inStock);

    /**
     * Removes an item from the menu catalog.
     */
    boolean deleteItem(String itemId);
}
