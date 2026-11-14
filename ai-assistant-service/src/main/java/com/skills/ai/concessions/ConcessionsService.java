package com.skills.ai.concessions;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.*;

/**
 * Service managing CineMind Gourmet Concessions, dietary validation,
 * and AI-driven sensory genre pairings.
 */
@Slf4j
@Service
public class ConcessionsService {

    private final List<ConcessionItem> menu = new ArrayList<>();

    public ConcessionsService() {
        seedMenu();
    }

    public List<ConcessionItem> getMenu() {
        return Collections.unmodifiableList(menu);
    }

    public Optional<ConcessionItem> getItem(String id) {
        return menu.stream().filter(i -> i.id().equalsIgnoreCase(id)).findFirst();
    }

    public List<ConcessionCombo> recommendCombos(String movieGenre, int partySize) {
        String genre = (movieGenre != null && !movieGenre.isBlank()) ? movieGenre.trim() : "Sci-Fi";
        int size = Math.max(1, partySize);

        List<ConcessionCombo> combos = new ArrayList<>();

        if (genre.equalsIgnoreCase("Sci-Fi") || genre.equalsIgnoreCase("Epic")) {
            ConcessionItem item1 = getItem("pop-truffle").orElse(menu.get(0));
            ConcessionItem item2 = getItem("bev-coldbrew").orElse(menu.get(1));
            ConcessionItem item3 = getItem("snk-choc-dust").orElse(menu.get(2));
            double orig = item1.price() + item2.price() + item3.price();
            double combo = Math.round((orig * 0.8) * 100.0) / 100.0;

            combos.add(new ConcessionCombo(
                    "cmb-scifi-wormhole",
                    "🚀 Interstellar Wormhole Combo",
                    List.of(item1, item2, item3),
                    orig,
                    combo,
                    orig - combo,
                    "Curated for deep sensory immersion: savory black truffle pairs with cold-brew caffeine to maintain focus through 3-hour cosmic epics.",
                    genre
            ));
        }

        if (genre.equalsIgnoreCase("Action") || genre.equalsIgnoreCase("Thriller")) {
            ConcessionItem item1 = getItem("snk-nachos").orElse(menu.get(3));
            ConcessionItem item2 = getItem("bev-craft-soda").orElse(menu.get(4));
            double orig = (item1.price() + item2.price()) * Math.min(size, 2);
            double combo = Math.round((orig * 0.85) * 100.0) / 100.0;

            combos.add(new ConcessionCombo(
                    "cmb-action-adrenaline",
                    "⚡ Adrenaline Crunch Pair",
                    List.of(item1, item2),
                    orig,
                    combo,
                    orig - combo,
                    "High-energy zesty jalapeño crunch paired with artisan ginger-lime craft soda to match high-octane pacing.",
                    genre
            ));
        }

        // Universal VIP Duo
        ConcessionItem p1 = getItem("pop-classic").orElse(menu.get(0));
        ConcessionItem p2 = getItem("bev-craft-soda").orElse(menu.get(4));
        double orig = (p1.price() + p2.price()) * 2;
        double combo = Math.round((orig * 0.78) * 100.0) / 100.0;

        combos.add(new ConcessionCombo(
                "cmb-classic-vip",
                "🍿 CineMind Gold Lounge Classic",
                List.of(p1, p2),
                orig,
                combo,
                orig - combo,
                "Double-clarified warm butter popcorn and zero-sugar sparkling botanicals. The quintessential cinema indulgence.",
                "Classic"
        ));

        return combos;
    }

    private void seedMenu() {
        menu.add(new ConcessionItem(
                "pop-classic",
                "Artisan Warm Butter Popcorn",
                "POPCORN",
                8.50,
                420,
                "🍿",
                List.of("Gluten-Free", "Vegetarian"),
                List.of("Action", "Comedy", "Classic"),
                "Organic kernels tossed in sea-salt and warm clarified butter."
        ));
        menu.add(new ConcessionItem(
                "pop-truffle",
                "Black Truffle & Rosemary Popcorn",
                "POPCORN",
                11.00,
                460,
                "✨",
                List.of("Vegan", "Gluten-Free"),
                List.of("Sci-Fi", "Drama", "Epic"),
                "Fresh popped corn infused with white truffle oil, cracked black pepper, and dried rosemary."
        ));
        menu.add(new ConcessionItem(
                "snk-nachos",
                "Chipotle Queso Loaded Nachos",
                "SNACKS",
                10.50,
                680,
                "🧀",
                List.of("Vegetarian"),
                List.of("Action", "Thriller"),
                "Crispy artisanal tortilla chips with warm chipotle cheddar queso and pickled jalapeños."
        ));
        menu.add(new ConcessionItem(
                "snk-choc-dust",
                "Dark Chocolate Sea Salt Pretzel Bites",
                "SNACKS",
                7.50,
                380,
                "🍫",
                List.of("Vegetarian"),
                List.of("Drama", "Romance"),
                "Warm Bavarian pretzel nuggets draped in 70% dark Belgian chocolate and flaky Maldon salt."
        ));
        menu.add(new ConcessionItem(
                "bev-craft-soda",
                "Wild Blackberry Craft Soda",
                "BEVERAGES",
                6.00,
                110,
                "🥤",
                List.of("Vegan", "Gluten-Free"),
                List.of("Action", "Family"),
                "Locally brewed sparkling soda sweetened with pure cane sugar and real Oregon blackberries."
        ));
        menu.add(new ConcessionItem(
                "bev-coldbrew",
                "Nitro Vanilla Sky Cold Brew",
                "BEVERAGES",
                7.00,
                80,
                "☕",
                List.of("Vegan", "Dairy-Free"),
                List.of("Sci-Fi", "Drama"),
                "Nitrogen-infused single-origin Ethiopian cold brew with subtle Madagascar vanilla."
        ));

        // Seed historical concessions orders in DB across trailing week
        seedHistoricalOrders();
    }

    private void seedHistoricalOrders() {
        java.time.Instant now = java.time.Instant.now();
        java.time.temporal.ChronoUnit days = java.time.temporal.ChronoUnit.DAYS;

        // Monday
        placeHistoricalOrder(List.of(Map.of("name", "Black Truffle & Rosemary Popcorn", "qty", 1, "price", 11.0)), "IMAX 70mm Auditorium 1, Seat A1", 11.00, now.minus(6, days));
        placeHistoricalOrder(List.of(Map.of("name", "Wild Blackberry Craft Soda", "qty", 2, "price", 6.0)), "70mm Large Format Screen 2, Seat C3", 12.00, now.minus(6, days));

        // Tuesday
        placeHistoricalOrder(List.of(Map.of("name", "Chipotle Queso Loaded Nachos", "qty", 1, "price", 10.5)), "70mm Large Format Screen 2, Seat C1", 10.50, now.minus(5, days));
        placeHistoricalOrder(List.of(Map.of("name", "Nitro Vanilla Sky Cold Brew", "qty", 2, "price", 7.0)), "IMAX 70mm Auditorium 1, Seat B3", 14.00, now.minus(5, days));

        // Wednesday
        placeHistoricalOrder(List.of(Map.of("name", "Black Truffle & Rosemary Popcorn", "qty", 2, "price", 11.0)), "IMAX 70mm Auditorium 1, Seat B2", 22.00, now.minus(4, days));
        placeHistoricalOrder(List.of(Map.of("name", "Dark Chocolate Sea Salt Pretzel Bites", "qty", 1, "price", 7.5)), "Dolby Cinema Auditorium 3, Seat A5", 7.50, now.minus(4, days));

        // Thursday
        placeHistoricalOrder(List.of(Map.of("name", "Chipotle Queso Loaded Nachos", "qty", 2, "price", 10.5)), "70mm Large Format Screen 2, Seat C2", 21.00, now.minus(3, days));
        placeHistoricalOrder(List.of(Map.of("name", "Wild Blackberry Craft Soda", "qty", 1, "price", 6.0)), "IMAX 70mm Auditorium 1, Seat D1", 6.00, now.minus(3, days));

        // Friday (High Traffic)
        placeHistoricalOrder(List.of(Map.of("name", "Black Truffle & Rosemary Popcorn", "qty", 3, "price", 11.0)), "IMAX 70mm Auditorium 1, Seat B1", 33.00, now.minus(2, days));
        placeHistoricalOrder(List.of(Map.of("name", "Nitro Vanilla Sky Cold Brew", "qty", 2, "price", 7.0)), "IMAX 70mm Auditorium 1, Seat C2", 14.00, now.minus(2, days));
        placeHistoricalOrder(List.of(Map.of("name", "Chipotle Queso Loaded Nachos", "qty", 2, "price", 10.5)), "70mm Large Format Screen 2, Seat A2", 21.00, now.minus(2, days));

        // Saturday (Peak Weekend)
        placeHistoricalOrder(List.of(Map.of("name", "Black Truffle & Rosemary Popcorn", "qty", 2, "price", 11.0), Map.of("name", "Nitro Vanilla Sky Cold Brew", "qty", 2, "price", 7.0)), "IMAX 70mm Auditorium 1, Seat C2", 36.00, now.minus(1, days));
        placeHistoricalOrder(List.of(Map.of("name", "Dark Chocolate Sea Salt Pretzel Bites", "qty", 2, "price", 7.5)), "70mm Large Format Screen 2, Seat A4", 15.00, now.minus(1, days));
        placeHistoricalOrder(List.of(Map.of("name", "Wild Blackberry Craft Soda", "qty", 3, "price", 6.0)), "Dolby Cinema Auditorium 3, Seat D2", 18.00, now.minus(1, days));

        // Today
        placeOrder(
                List.of(
                        Map.of("name", "Black Truffle & Rosemary Popcorn", "qty", 1, "price", 11.00),
                        Map.of("name", "Nitro Vanilla Sky Cold Brew", "qty", 1, "price", 7.00)
                ),
                "IMAX 70mm Auditorium 1, Seat B3",
                18.00
        );
    }

    public ConcessionOrder placeHistoricalOrder(List<Map<String, Object>> items, String deliverySeat, double total, java.time.Instant createdAt) {
        String orderId = "FB-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        ConcessionOrder order = ConcessionOrder.builder()
                .orderId(orderId)
                .items(items != null ? items : List.of())
                .totalAmount(total > 0 ? total : 18.50)
                .deliverySeat(deliverySeat != null && !deliverySeat.isBlank() ? deliverySeat : "Express VIP Pickup Counter")
                .status("DELIVERED")
                .estimatedMinutes(0)
                .createdAt(createdAt != null ? createdAt : java.time.Instant.now())
                .build();
        orders.put(orderId, order);
        return order;
    }

    private final Map<String, ConcessionOrder> orders = new java.util.concurrent.ConcurrentHashMap<>();
    private final Sinks.Many<ConcessionOrder> orderEventSink =
            Sinks.many().multicast().onBackpressureBuffer();

    public Flux<ConcessionOrder> getOrderEvents() {
        return orderEventSink.asFlux();
    }

    public ConcessionOrder placeOrder(List<Map<String, Object>> items, String deliverySeat, double total) {
        String orderId = "FB-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        ConcessionOrder order = ConcessionOrder.builder()
                .orderId(orderId)
                .items(items != null ? items : List.of())
                .totalAmount(total > 0 ? total : 18.50)
                .deliverySeat(deliverySeat != null && !deliverySeat.isBlank() ? deliverySeat : "Express VIP Pickup Counter")
                .status("PREPARING")
                .estimatedMinutes(8)
                .createdAt(java.time.Instant.now())
                .build();
        orders.put(orderId, order);
        orderEventSink.tryEmitNext(order);
        log.info("🍿 Placed concessions order: id={}, total={}, deliverySeat={}", orderId, total, deliverySeat);
        return order;
    }

    public Optional<ConcessionOrder> updateOrderStatus(String orderId, String newStatus) {
        ConcessionOrder existing = orders.get(orderId);
        if (existing == null) {
            return Optional.empty();
        }
        String cleanStatus = (newStatus != null && !newStatus.isBlank()) ? newStatus.toUpperCase().trim() : "PLATED";
        int newEst = switch (cleanStatus) {
            case "PLATED", "READY" -> 3;
            case "OUT_FOR_DELIVERY" -> 1;
            case "DELIVERED" -> 0;
            default -> Math.max(1, existing.estimatedMinutes() - 2);
        };
        ConcessionOrder updated = ConcessionOrder.builder()
                .orderId(existing.orderId())
                .items(existing.items())
                .totalAmount(existing.totalAmount())
                .deliverySeat(existing.deliverySeat())
                .status(cleanStatus)
                .estimatedMinutes(newEst)
                .createdAt(existing.createdAt())
                .build();
        orders.put(orderId, updated);
        orderEventSink.tryEmitNext(updated);
        log.info("🍽️ Order status advanced: orderId={}, status={}, remainingMinutes={}", orderId, cleanStatus, newEst);
        return Optional.of(updated);
    }

    public List<ConcessionOrder> listOrders() {
        return new ArrayList<>(orders.values());
    }
}
