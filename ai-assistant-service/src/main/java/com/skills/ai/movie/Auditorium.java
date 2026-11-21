package com.skills.ai.movie;

/**
 * Immutable record representing an auditorium screen and projection format in PostgreSQL.
 */
public record Auditorium(
        String id,
        String cinemaId,
        String name,
        String format,
        int capacity,
        double surgeMultiplier,
        String perk,
        String soundSystem
) {}
