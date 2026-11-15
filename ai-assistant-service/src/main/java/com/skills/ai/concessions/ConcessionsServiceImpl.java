package com.skills.ai.concessions;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skills.ai.persistence.queries.ConcessionSqlQueries;
import com.skills.ai.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

import static com.skills.ai.persistence.queries.ConcessionSqlQueries.*;

/**
 * Relational database-backed implementation of ConcessionsService managing CineMind Gourmet Concessions,
 * dietary validation, and real-time order lifecycle events across distributed cluster pods via Redis Pub/Sub.
 */
@Slf4j
@Service
public class ConcessionsServiceImpl implements ConcessionsService {

    private final String nodeId = UUID.randomUUID().toString().substring(0, 8);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final List<ConcessionItem> menu = new ArrayList<>();
    private final Sinks.Many<ConcessionOrder> orderEventSink =
            Sinks.many().multicast().onBackpressureBuffer();

    public ConcessionsServiceImpl(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            @Autowired(required = false) RedisMessageListenerContainer listenerContainer,
            @Autowired(required = false) @Qualifier("orderEventsTopic") ChannelTopic orderEventsTopic
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        seedMenu();
        initClusterPubSubListener(listenerContainer, orderEventsTopic);
    }

    private void initClusterPubSubListener(RedisMessageListenerContainer container, ChannelTopic topic) {
        if (container != null && topic != null) {
            try {
                container.addMessageListener((message, pattern) -> {
                    try {
                        String body = new String(message.getBody());
                        Map<String, Object> payload = objectMapper.readValue(body, new TypeReference<>() {});
                        String senderNode = (String) payload.get("nodeId");
                        if (!nodeId.equals(senderNode)) {
                            ConcessionOrder order = objectMapper.convertValue(payload.get("order"), ConcessionOrder.class);
                            if (order != null) {
                                orderEventSink.tryEmitNext(order);
                                log.debug("📡 [Cluster Pub/Sub] Received remote concession order event on node {}: {}", nodeId, order.orderId());
                            }
                        }
                    } catch (Exception e) {
                        log.debug("Failed to deserialize cluster order event: {}", e.getMessage());
                    }
                }, topic);
                log.info("📡 Subscribed node {} to distributed Redis order topic: {}", nodeId, topic.getTopic());
            } catch (Exception e) {
                log.warn("⚠️ Failed to register Redis Pub/Sub listener for concession orders: {}", e.getMessage());
            }
        }
    }

    private void broadcastOrderEvent(ConcessionOrder order) {
        orderEventSink.tryEmitNext(order);
        if (redisTemplate != null) {
            try {
                Map<String, Object> payload = Map.of(
                        "nodeId", nodeId,
                        "order", order
                );
                String json = objectMapper.writeValueAsString(payload);
                redisTemplate.convertAndSend("cinemind:topic:orders", json);
            } catch (Exception e) {
                log.debug("Redis order event broadcast skipped: {}", e.getMessage());
            }
        }
    }

    @Override
    public Flux<ConcessionOrder> getOrderEvents() {
        return orderEventSink.asFlux();
    }

    @Override
    public List<ConcessionItem> getMenu() {
        return Collections.unmodifiableList(menu);
    }

    @Override
    public Optional<ConcessionItem> getItem(String id) {
        return menu.stream().filter(i -> i.id().equalsIgnoreCase(id)).findFirst();
    }

    @Override
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
    }

    @Override
    public ConcessionOrder placeOrder(List<Map<String, Object>> items, String deliverySeat, double total) {
        return placeOrder(items, deliverySeat, total, Instant.now());
    }

    @Override
    public ConcessionOrder placeOrder(List<Map<String, Object>> items, String deliverySeat, double total, Instant createdAt) {
        String orderId = "FB-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        Instant orderTime = (createdAt != null) ? createdAt : Instant.now();
        List<Map<String, Object>> orderItems = (items != null) ? items : List.of();
        double orderTotal = (total > 0) ? total : 18.50;
        String seat = (deliverySeat != null && !deliverySeat.isBlank()) ? deliverySeat : "Express VIP Pickup Counter";

        String itemsJson = JsonUtils.toJsonOrFallback(orderItems, "[]");

        jdbcTemplate.update(
                INSERT_ORDER,
                orderId, itemsJson, seat, orderTotal, "PREPARING", 8, Timestamp.from(orderTime)
        );

        ConcessionOrder order = ConcessionOrder.builder()
                .orderId(orderId)
                .items(orderItems)
                .totalAmount(orderTotal)
                .deliverySeat(seat)
                .status("PREPARING")
                .estimatedMinutes(8)
                .createdAt(orderTime)
                .build();

        broadcastOrderEvent(order);
        log.info("🍿 Placed concessions order in DB: id={}, total={}, deliverySeat={}", orderId, orderTotal, seat);
        return order;
    }

    @Override
    @Transactional
    public Optional<ConcessionOrder> updateOrderStatus(String orderId, String newStatus) {
        List<ConcessionOrder> matches = jdbcTemplate.query(
                SELECT_ORDER_BY_ID,
                this::mapRowToOrder,
                orderId
        );
        if (matches.isEmpty()) {
            return Optional.empty();
        }
        ConcessionOrder existing = matches.get(0);
        String cleanStatus = (newStatus != null && !newStatus.isBlank()) ? newStatus.toUpperCase().trim() : "PLATED";
        int newEst = switch (cleanStatus) {
            case "PLATED", "READY" -> 3;
            case "OUT_FOR_DELIVERY" -> 1;
            case "DELIVERED" -> 0;
            default -> Math.max(1, existing.estimatedMinutes() - 2);
        };

        jdbcTemplate.update(
                UPDATE_ORDER_STATUS,
                cleanStatus, newEst, orderId
        );

        ConcessionOrder updated = ConcessionOrder.builder()
                .orderId(existing.orderId())
                .items(existing.items())
                .totalAmount(existing.totalAmount())
                .deliverySeat(existing.deliverySeat())
                .status(cleanStatus)
                .estimatedMinutes(newEst)
                .createdAt(existing.createdAt())
                .build();

        broadcastOrderEvent(updated);
        log.info("🍽️ Order status advanced in DB: orderId={}, status={}, remainingMinutes={}", orderId, cleanStatus, newEst);
        return Optional.of(updated);
    }

    @Override
    public List<ConcessionOrder> listOrders() {
        return jdbcTemplate.query(
                SELECT_ALL_ORDERS,
                this::mapRowToOrder
        );
    }

    private ConcessionOrder mapRowToOrder(ResultSet rs, int rowNum) throws SQLException {
        String itemsJson = rs.getString("items_json");
        List<Map<String, Object>> items = JsonUtils.fromJsonListOfMaps(itemsJson);
        Timestamp ts = rs.getTimestamp("created_at");
        Instant createdAt = (ts != null) ? ts.toInstant() : Instant.now();

        return ConcessionOrder.builder()
                .orderId(rs.getString("order_id"))
                .items(items)
                .totalAmount(rs.getDouble("total_amount"))
                .deliverySeat(rs.getString("delivery_seat"))
                .status(rs.getString("status"))
                .estimatedMinutes(rs.getInt("estimated_minutes"))
                .createdAt(createdAt)
                .build();
    }
}
