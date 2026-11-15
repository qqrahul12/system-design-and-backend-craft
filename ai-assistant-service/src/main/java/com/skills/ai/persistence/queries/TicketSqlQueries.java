package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for Digital Ticket & Gate Pass operations.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class TicketSqlQueries {

    private TicketSqlQueries() {}

    public static final String INSERT_TICKET =
            "INSERT INTO tickets (ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    public static final String SELECT_TICKET_BY_ID =
            "SELECT ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at " +
            "FROM tickets WHERE ticket_id = ?";

    public static final String SELECT_ALL_TICKETS =
            "SELECT ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at " +
            "FROM tickets ORDER BY issued_at DESC";

    public static final String UPDATE_TICKET_CHECKED_IN =
            "UPDATE tickets SET status = 'CHECKED_IN' WHERE ticket_id = ?";

    public static final String DELETE_TICKET_BY_ID =
            "DELETE FROM tickets WHERE ticket_id = ?";
}
