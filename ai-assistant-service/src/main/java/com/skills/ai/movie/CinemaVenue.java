package com.skills.ai.movie;

import java.util.List;

/**
 * Immutable record representing a theatrical cinema venue and its screens in PostgreSQL.
 */
public record CinemaVenue(
        String id,
        String name,
        String shortName,
        String neighborhood,
        String distance,
        String address,
        List<String> features,
        List<Auditorium> screens
) {}
