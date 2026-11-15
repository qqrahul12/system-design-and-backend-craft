package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for Concession Items & Orders.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class ConcessionSqlQueries {

    private ConcessionSqlQueries() {}

    public static final String COUNT_ITEMS =
            "SELECT COUNT(*) FROM concession_items";

    public static final String SELECT_ALL_ITEMS =
            "SELECT id, name, category, price, calories, icon, dietary_tags_csv, genre_pairings_csv, description, in_stock " +
            "FROM concession_items ORDER BY category, price";

    public static final String SELECT_ITEM_BY_ID =
            "SELECT id, name, category, price, calories, icon, dietary_tags_csv, genre_pairings_csv, description, in_stock " +
            "FROM concession_items WHERE id = ?";

    public static final String UPSERT_ITEM =
            "INSERT INTO concession_items (id, name, category, price, calories, icon, dietary_tags_csv, genre_pairings_csv, description, in_stock, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) " +
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price, " +
            "calories = EXCLUDED.calories, icon = EXCLUDED.icon, dietary_tags_csv = EXCLUDED.dietary_tags_csv, " +
            "genre_pairings_csv = EXCLUDED.genre_pairings_csv, description = EXCLUDED.description, " +
            "in_stock = EXCLUDED.in_stock, updated_at = CURRENT_TIMESTAMP";

    public static final String UPDATE_ITEM_STOCK =
            "UPDATE concession_items SET in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";

    public static final String DELETE_ITEM =
            "DELETE FROM concession_items WHERE id = ?";

    public static final String INSERT_ORDER =
            "INSERT INTO concession_orders (order_id, items_json, delivery_seat, total_amount, status, estimated_minutes, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)";

    public static final String SELECT_ORDER_BY_ID =
            "SELECT order_id, items_json, delivery_seat, total_amount, status, estimated_minutes, created_at " +
            "FROM concession_orders WHERE order_id = ?";

    public static final String UPDATE_ORDER_STATUS =
            "UPDATE concession_orders SET status = ?, estimated_minutes = ? WHERE order_id = ?";

    public static final String SELECT_ALL_ORDERS =
            "SELECT order_id, items_json, delivery_seat, total_amount, status, estimated_minutes, created_at " +
            "FROM concession_orders ORDER BY created_at DESC";
}
