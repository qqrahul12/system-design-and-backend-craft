package com.skills.ai.movie;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing live movie catalog management.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieCatalogService movieCatalogService;

    @GetMapping
    public ResponseEntity<List<Movie>> getAllMovies(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(movieCatalogService.getAllMovies(genre, status, search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Movie> getMovieById(@PathVariable Long id) {
        return movieCatalogService.getMovieById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<Map<String, Object>> getMovieReviews(@PathVariable Long id) {
        return movieCatalogService.getMovieById(id)
                .map(m -> ResponseEntity.ok(Map.<String, Object>of(
                        "movieId", m.getId(),
                        "title", m.getTitle(),
                        "rottenTomatoes", m.getRottenTomatoes() != null ? m.getRottenTomatoes() : 88,
                        "metacritic", m.getMetacritic() != null ? m.getMetacritic() : 80,
                        "imdbRating", m.getImdbRating() != null ? m.getImdbRating() : 8.2,
                        "criticConsensus", m.getCriticConsensus() != null ? m.getCriticConsensus() : "Critically acclaimed theatrical presentation.",
                        "topCriticQuote", m.getTopCriticQuote() != null ? m.getTopCriticQuote() : "\"Exceptional cinema.\" — Variety",
                        "reviewsCount", m.getReviewsCount() != null ? m.getReviewsCount() : 350
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Movie> createMovie(@RequestBody Movie movie) {
        Movie created = movieCatalogService.createMovie(movie);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Movie> updateMovie(@PathVariable Long id, @RequestBody Movie movie) {
        return movieCatalogService.updateMovie(id, movie)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteMovie(@PathVariable Long id) {
        boolean deleted = movieCatalogService.deleteMovie(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Movie removed from catalog", "id", id));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "error", "Movie not found"));
    }

    @PostMapping("/ai-draft")
    public ResponseEntity<Movie> aiDraftMovie(@RequestBody Map<String, String> request) {
        String title = request.getOrDefault("title", "Untitled Blockbuster");
        String genreHint = request.get("genre");
        Movie drafted = movieCatalogService.aiDraftMovie(title, genreHint);
        return ResponseEntity.ok(drafted);
    }

    @PostMapping("/ingest-current-year")
    public ResponseEntity<List<Movie>> ingestCurrentYear(@RequestBody(required = false) Map<String, Object> req) {
        int year = (req != null && req.containsKey("year")) ? ((Number) req.get("year")).intValue() : 2026;
        List<Movie> ingested = movieCatalogService.ingestCurrentYearMovies(year);
        return ResponseEntity.ok(ingested);
    }

    @GetMapping("/auditoriums")
    public ResponseEntity<List<Auditorium>> getAuditoriums() {
        return ResponseEntity.ok(movieCatalogService.getAuditoriums());
    }
}
