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
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

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
    private static final String REDIS_KEY_MENU = "cinemind:concessions:menu";
    private static final Duration CONCESSIONS_CACHE_TTL = Duration.ofMinutes(30);
    private static final String REDIS_KEY_CONCESSIONS_COMBOS_PREFIX = "cinemind:concessions:combos:";
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
        logStartupInventory();
        initClusterPubSubListener(listenerContainer, orderEventsTopic);
    }

    private void logStartupInventory() {
        if (jdbcTemplate != null) {
            try {
                Integer count = jdbcTemplate.queryForObject(COUNT_ITEMS, Integer.class);
                log.info("🍿 Found {} persisted gourmet concession items in PostgreSQL (SSOT). Zero hardcoded startup seeding in code.", count != null ? count : 0);
            } catch (Exception e) {
                log.warn("⚠️ Failed to query concession_items count from PostgreSQL: {}", e.getMessage());
            }
        }
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
        if (redisTemplate != null) {
            try {
                String cached = redisTemplate.opsForValue().get(REDIS_KEY_MENU);
                if (cached != null && !cached.isBlank()) {
                    List<ConcessionItem> list = objectMapper.readValue(cached, new TypeReference<List<ConcessionItem>>() {});
                    if (list != null && !list.isEmpty()) {
                        return list;
                    }
                }
            } catch (Exception e) {
                log.debug("Redis menu cache check skipped: {}", e.getMessage());
            }
        }

        if (jdbcTemplate != null) {
            try {
                List<ConcessionItem> items = jdbcTemplate.query(SELECT_ALL_ITEMS, this::mapRowToItem);
                if (!items.isEmpty()) {
                    if (redisTemplate != null) {
                        try {
                            redisTemplate.opsForValue().set(REDIS_KEY_MENU, objectMapper.writeValueAsString(items), CONCESSIONS_CACHE_TTL);
                        } catch (Exception ignored) {}
                    }
                    return items;
                }
            } catch (Exception e) {
                log.warn("⚠️ Error loading concession items from PostgreSQL: {}", e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    @Override
    public Optional<ConcessionItem> getItem(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        if (jdbcTemplate != null) {
            try {
                List<ConcessionItem> results = jdbcTemplate.query(SELECT_ITEM_BY_ID, this::mapRowToItem, id);
                if (!results.isEmpty()) {
                    return Optional.of(results.get(0));
                }
            } catch (Exception e) {
                log.debug("Error fetching concession item {}: {}", id, e.getMessage());
            }
        }
        return getMenu().stream().filter(i -> i.id().equalsIgnoreCase(id)).findFirst();
    }

    @Override
    @Transactional
    public ConcessionItem saveItem(ConcessionItem item) {
        if (item == null || jdbcTemplate == null) return item;
        String id = (item.id() != null && !item.id().isBlank())
                ? item.id()
                : "cns-" + UUID.randomUUID().toString().substring(0, 8);

        String dietaryCsv = (item.dietary() != null) ? String.join(", ", item.dietary()) : "";
        String genreCsv = (item.genrePairings() != null) ? String.join(", ", item.genrePairings()) : "";
        boolean inStock = item.inStock() == null || item.inStock();

        jdbcTemplate.update(
                UPSERT_ITEM,
                id, item.name(), item.category(), item.price(), item.calories(),
                item.icon() != null ? item.icon() : "🍿",
                dietaryCsv, genreCsv, item.description(), inStock
        );
        invalidateConcessionsCache();
        log.info("🍿 Persisted concession item to PostgreSQL (SSOT): id={}, name={}, price={}", id, item.name(), item.price());
        return new ConcessionItem(id, item.name(), item.category(), item.price(), item.calories(),
                item.icon() != null ? item.icon() : "🍿", item.dietary(), item.genrePairings(), item.description(), inStock);
    }

    @Override
    @Transactional
    public List<ConcessionItem> saveItems(List<ConcessionItem> items) {
        if (items == null || items.isEmpty()) return List.of();
        return items.stream().map(this::saveItem).toList();
    }

    @Override
    @Transactional
    public Optional<ConcessionItem> toggleStock(String itemId, boolean inStock) {
        if (itemId == null || jdbcTemplate == null) return Optional.empty();
        int rows = jdbcTemplate.update(UPDATE_ITEM_STOCK, inStock, itemId);
        if (rows > 0) {
            invalidateConcessionsCache();
            log.info("📦 Toggled stock for concession item {} to {}", itemId, inStock);
            return getItem(itemId);
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public boolean deleteItem(String itemId) {
        if (itemId == null || jdbcTemplate == null) return false;
        int rows = jdbcTemplate.update(DELETE_ITEM, itemId);
        if (rows > 0) {
            invalidateConcessionsCache();
            log.info("🗑️ Deleted concession item {} from PostgreSQL", itemId);
            return true;
        }
        return false;
    }

    private void invalidateConcessionsCache() {
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(REDIS_KEY_MENU);
                Set<String> comboKeys = redisTemplate.keys(REDIS_KEY_CONCESSIONS_COMBOS_PREFIX + "*");
                if (comboKeys != null && !comboKeys.isEmpty()) {
                    redisTemplate.delete(comboKeys);
                }
            } catch (Exception ignored) {}
        }
    }

    private ConcessionItem mapRowToItem(ResultSet rs, int rowNum) throws SQLException {
        String dietaryCsv = rs.getString("dietary_tags_csv");
        List<String> dietary = (dietaryCsv != null && !dietaryCsv.isBlank())
                ? Arrays.stream(dietaryCsv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                : List.of();

        String genreCsv = rs.getString("genre_pairings_csv");
        List<String> pairings = (genreCsv != null && !genreCsv.isBlank())
                ? Arrays.stream(genreCsv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                : List.of("All");

        return new ConcessionItem(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getDouble("price"),
                rs.getInt("calories"),
                rs.getString("icon"),
                dietary,
                pairings,
                rs.getString("description"),
                rs.getBoolean("in_stock")
        );
    }

    @Override
    public List<ConcessionCombo> recommendCombos(String movieGenre, int partySize) {
        String genre = (movieGenre != null && !movieGenre.isBlank()) ? movieGenre.trim() : "Sci-Fi";
        int size = Math.max(1, partySize);

        String cacheKey = REDIS_KEY_CONCESSIONS_COMBOS_PREFIX + genre.toLowerCase() + ":" + size;
        if (redisTemplate != null) {
            try {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null && !cached.isBlank()) {
                    List<ConcessionCombo> cachedCombos = objectMapper.readValue(cached, new TypeReference<List<ConcessionCombo>>() {});
                    if (cachedCombos != null && !cachedCombos.isEmpty()) {
                        log.debug("⚡ [Redis Cache HIT] Retrieved combos for genre={}, size={} in <1ms", genre, size);
                        return cachedCombos;
                    }
                }
            } catch (Exception e) {
                log.debug("Redis combos cache check skipped: {}", e.getMessage());
            }
        }

        List<ConcessionCombo> combos = new ArrayList<>();
        List<ConcessionItem> allItems = getMenu();
        if (allItems.isEmpty()) {
            return Collections.emptyList();
        }

        List<ConcessionItem> inStock = allItems.stream()
                .filter(ConcessionItem::isInStock)
                .toList();
        final List<ConcessionItem> effectiveInStock = inStock.isEmpty() ? allItems : inStock;

        // Dynamically find items matching the requested genre
        List<ConcessionItem> genreMatched = effectiveInStock.stream()
                .filter(i -> i.genrePairings() != null && i.genrePairings().stream().anyMatch(g -> g.equalsIgnoreCase(genre)))
                .toList();

        // 1. Curated Genre-Specific Feature Combo (Main snack/popcorn + beverage)
        ConcessionItem snack = genreMatched.stream()
                .filter(i -> "POPCORN".equalsIgnoreCase(i.category()) || "SNACKS".equalsIgnoreCase(i.category()) || "HOT_FOOD".equalsIgnoreCase(i.category()))
                .findFirst()
                .orElseGet(() -> effectiveInStock.stream().filter(i -> !"BEVERAGES".equalsIgnoreCase(i.category())).findFirst().orElse(effectiveInStock.get(0)));

        ConcessionItem drink = genreMatched.stream()
                .filter(i -> "BEVERAGES".equalsIgnoreCase(i.category()))
                .findFirst()
                .orElseGet(() -> effectiveInStock.stream().filter(i -> "BEVERAGES".equalsIgnoreCase(i.category())).findFirst().orElse(effectiveInStock.get(effectiveInStock.size() > 1 ? 1 : 0)));

        List<ConcessionItem> comboItems = new ArrayList<>(List.of(snack, drink));
        if (size >= 3) {
            effectiveInStock.stream()
                    .filter(i -> !comboItems.contains(i))
                    .findFirst()
                    .ifPresent(comboItems::add);
        }

        double origPrice = comboItems.stream().mapToDouble(ConcessionItem::price).sum();
        double discountedPrice = Math.round((origPrice * 0.82) * 100.0) / 100.0;
        double savings = Math.round((origPrice - discountedPrice) * 100.0) / 100.0;

        combos.add(new ConcessionCombo(
                "cmb-" + genre.toLowerCase().replaceAll("[^a-z0-9]", "") + "-pairing",
                "Sensory " + genre + " Experience Bundle",
                comboItems,
                origPrice,
                discountedPrice,
                savings,
                "Curated sensory pairing: " + snack.name() + " paired with " + drink.name() + " formulated for " + genre + " theatrical screenings.",
                genre
        ));

        // 2. Chef's Tasting Flight (Top distinct category items)
        Map<String, ConcessionItem> byCategory = effectiveInStock.stream()
                .collect(Collectors.toMap(ConcessionItem::category, item -> item, (existing, replacement) -> existing));
        List<ConcessionItem> flightItems = new ArrayList<>(byCategory.values()).stream().limit(3).toList();
        if (flightItems.size() >= 2) {
            double flightOrig = flightItems.stream().mapToDouble(ConcessionItem::price).sum();
            double flightDiscounted = Math.round((flightOrig * 0.80) * 100.0) / 100.0;
            combos.add(new ConcessionCombo(
                    "cmb-gourmet-flight",
                    "Gourmet Concessions Tasting Flight",
                    flightItems,
                    flightOrig,
                    flightDiscounted,
                    Math.round((flightOrig - flightDiscounted) * 100.0) / 100.0,
                    "Multi-course culinary flight featuring fresh kitchen selections tailored for the ultimate VIP lounge experience.",
                    "Culinary"
            ));
        }

        if (redisTemplate != null && !combos.isEmpty()) {
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(combos), CONCESSIONS_CACHE_TTL);
                log.debug("⚡ [Redis Cache SET] Cached combos for genre={}, size={} with 30m TTL", genre, size);
            } catch (Exception e) {
                log.debug("Redis combos cache store skipped: {}", e.getMessage());
            }
        }

        return combos;
    }

    @Override
    @Transactional
    public ConcessionOrder placeOrder(List<Map<String, Object>> items, String deliverySeat, double total) {
        return placeOrder(items, deliverySeat, total, Instant.now());
    }

    @Override
    @Transactional
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
