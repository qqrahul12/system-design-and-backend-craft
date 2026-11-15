package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for Concession Orders.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class ConcessionSqlQueries {

    private ConcessionSqlQueries() {}

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
