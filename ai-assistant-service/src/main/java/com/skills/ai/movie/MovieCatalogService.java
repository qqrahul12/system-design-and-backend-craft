package com.skills.ai.movie;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Interface contract for CineMind's live theatrical movie catalog.
 * Defines operations for querying, CRUD lifecycle, AI-drafting, and seasonal catalog ingestion.
 * Adheres to Dependency Inversion (DIP) and Interface Segregation (ISP).
 */
public interface MovieCatalogService {

    /**
     * Lists all movies matching optional filters (genre, release status, title search).
     */
    List<Movie> getAllMovies(String genre, String status, String search);

    /**
     * Retrieves a movie by unique numerical identifier.
     */
    Optional<Movie> getMovieById(Long id);

    /**
     * Adds a new theatrical film entry to the catalog.
     */
    Movie createMovie(Movie movie);

    /**
     * Modifies an existing theatrical movie entry.
     */
    Optional<Movie> updateMovie(Long id, Movie updated);

    /**
     * Deletes a movie entry from the catalog.
     */
    boolean deleteMovie(Long id);

    /**
     * AI-powered auto-drafting assistant for cinema programmers.
     */
    Movie aiDraftMovie(String title, String genreHint);

    /**
     * Ingests premier blockbuster releases for a designated theatrical year.
     */
    List<Movie> ingestCurrentYearMovies(int targetYear);

    /**
     * Retrieves all verified circuit auditoriums from PostgreSQL SSOT.
     */
    List<Auditorium> getAuditoriums();

    /**
     * Normalizes YouTube links into embeddable URLs for trailer players.
     */
    static String normalizeTrailerUrl(String url) {
        if (url == null || url.isBlank()) return "https://www.youtube.com/embed/zSWdZVtXT7E";
        String trimmed = url.trim();
        if (trimmed.contains("youtube.com/embed/")) {
            return trimmed;
        }
        var m = Pattern.compile("(?:youtube\\.com/watch\\?v=|youtu\\.be/|youtube\\.com/shorts/)([a-zA-Z0-9_-]{11})").matcher(trimmed);
        if (m.find()) {
            return "https://www.youtube.com/embed/" + m.group(1);
        }
        return trimmed;
    }
}
