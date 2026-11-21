package com.skills.ai.movie;

import com.fasterxml.jackson.core.type.TypeReference;
import com.skills.ai.persistence.queries.MovieSqlQueries;
import com.skills.ai.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static com.skills.ai.persistence.queries.MovieSqlQueries.*;

/**
 * Relational PostgreSQL-backed implementation of MovieCatalogService managing CineMind's live theatrical catalog.
 * Follows Single Source of Truth architecture and strict transactional boundaries to eliminate dual-write hazards.
 * Features L2 Distributed Redis caching with explicit 15m TTLs and eviction on catalog mutations.
 */
@Slf4j
@Service
public class MovieCatalogServiceImpl implements MovieCatalogService {

    private static final String REDIS_KEY_MOVIES_ALL = "cinemind:cache:movies:all";
    private static final String REDIS_KEY_MOVIE_PREFIX = "cinemind:cache:movie:";
    private static final Duration MOVIE_CACHE_TTL = Duration.ofMinutes(15);

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final AtomicLong idSequence = new AtomicLong(100);
    private final ChatClient geminiChatClient;
    private final ChatClient groqChatClient;

    public MovieCatalogServiceImpl(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            @Autowired(required = false) @Qualifier("geminiChatClient") ChatClient geminiChatClient,
            @Autowired(required = false) @Qualifier("groqChatClient") ChatClient groqChatClient
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        this.geminiChatClient = geminiChatClient;
        this.groqChatClient = groqChatClient;
        syncSequenceFromDatabase();
    }

    private void syncSequenceFromDatabase() {
        if (jdbcTemplate == null) return;
        try {
            Long maxId = jdbcTemplate.queryForObject(SELECT_MAX_ID, Long.class);
            if (maxId != null && maxId > 100) {
                idSequence.set(maxId);
            }
        } catch (Exception e) {
            log.warn("Failed to synchronize movie sequence: {}", e.getMessage());
        }
    }

    private Movie mapRow(ResultSet rs, int rowNum) throws SQLException {
        String seatsCsv = rs.getString("suggested_seats_csv");
        List<String> seats = (seatsCsv != null && !seatsCsv.isBlank())
                ? Arrays.stream(seatsCsv.split(",")).map(String::trim).toList()
                : Collections.emptyList();

        return Movie.builder()
                .id(rs.getLong("id"))
                .title(rs.getString("title"))
                .genre(rs.getString("genre"))
                .rating(rs.getDouble("rating"))
                .year(rs.getInt("year"))
                .releaseDate(rs.getString("release_date"))
                .duration(rs.getString("duration"))
                .price(rs.getDouble("price"))
                .aiPick(rs.getBoolean("ai_pick"))
                .synopsis(rs.getString("synopsis"))
                .suggestedSeats(seats)
                .posterUrl(rs.getString("poster_url"))
                .auditorium(rs.getString("auditorium"))
                .status(rs.getString("status"))
                .occupancyRate(rs.getInt("occupancy_rate"))
                .showtimes(rs.getString("showtimes"))
                .rottenTomatoes(rs.getInt("rotten_tomatoes"))
                .metacritic(rs.getInt("metacritic"))
                .imdbRating(rs.getDouble("imdb_rating"))
                .criticConsensus(rs.getString("critic_consensus"))
                .topCriticQuote(rs.getString("top_critic_quote"))
                .reviewsCount(rs.getInt("reviews_count"))
                .trailerUrl(rs.getString("trailer_url"))
                .director(rs.getString("director"))
                .cast(rs.getString("cast_members"))
                .ageRating(rs.getString("age_rating"))
                .build();
    }

    private int saveMovieToDatabase(Movie m) {
        String seatsCsv = m.getSuggestedSeats() != null ? String.join(", ", m.getSuggestedSeats()) : "C3, C4";
        return jdbcTemplate.update(
            UPSERT_MOVIE,
            m.getId(), m.getTitle(), m.getGenre(), m.getRating(), m.getYear(), m.getReleaseDate(),
            m.getDuration(), m.getPrice(), m.getAiPick(), m.getSynopsis(), seatsCsv,
            m.getPosterUrl(), m.getAuditorium(), m.getStatus(), m.getOccupancyRate(),
            m.getShowtimes(), m.getRottenTomatoes(), m.getMetacritic(), m.getImdbRating(),
            m.getCriticConsensus(), m.getTopCriticQuote(), m.getReviewsCount(),
            m.getTrailerUrl(), m.getDirector(), m.getCast(), m.getAgeRating()
        );
    }

    private void evictMovieCaches(Long movieId) {
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(REDIS_KEY_MOVIES_ALL);
                if (movieId != null) {
                    redisTemplate.delete(REDIS_KEY_MOVIE_PREFIX + movieId);
                }
                log.debug("[Redis Cache Evict] Evicted movie caches (movieId={})", movieId);
            } catch (Exception e) {
                log.debug("Redis movie cache eviction skipped: {}", e.getMessage());
            }
        }
    }

    @Override
    public List<Movie> getAllMovies(String genre, String status, String search) {
        boolean isFullCatalog = (genre == null || genre.isBlank()) &&
                (status == null || status.isBlank()) &&
                (search == null || search.isBlank());

        // Fast-path: check distributed Redis cache for full catalog queries
        if (isFullCatalog && redisTemplate != null) {
            try {
                String cached = redisTemplate.opsForValue().get(REDIS_KEY_MOVIES_ALL);
                if (cached != null && !cached.isBlank()) {
                    List<Movie> cachedList = JsonUtils.fromJson(cached, new TypeReference<List<Movie>>() {});
                    if (cachedList != null && !cachedList.isEmpty()) {
                        log.debug("[Redis Cache HIT] Retrieved {} movies from Redis cache in <2ms", cachedList.size());
                        return cachedList;
                    }
                }
            } catch (Exception e) {
                log.debug("Redis movie cache check skipped: {}", e.getMessage());
            }
        }

        if (jdbcTemplate != null) {
            try {
                StringBuilder sql = new StringBuilder(BASE_SELECT_ALL);
                List<Object> params = new ArrayList<>();
                if (genre != null && !genre.isBlank()) {
                    sql.append(" AND LOWER(genre) = LOWER(?)");
                    params.add(genre);
                }
                if (status != null && !status.isBlank()) {
                    sql.append(" AND LOWER(status) = LOWER(?)");
                    params.add(status);
                }
                if (search != null && !search.isBlank()) {
                    sql.append(" AND (LOWER(title) LIKE LOWER(?) OR LOWER(synopsis) LIKE LOWER(?) OR LOWER(director) LIKE LOWER(?))");
                    String pattern = "%" + search + "%";
                    params.add(pattern);
                    params.add(pattern);
                    params.add(pattern);
                }
                sql.append(" ORDER BY id ASC");
                List<Movie> movies = jdbcTemplate.query(sql.toString(), this::mapRow, params.toArray());

                if (isFullCatalog && redisTemplate != null && !movies.isEmpty()) {
                    try {
                        redisTemplate.opsForValue().set(REDIS_KEY_MOVIES_ALL, JsonUtils.toJson(movies), MOVIE_CACHE_TTL);
                        log.debug("[Redis Cache SET] Cached {} movies in Redis (TTL: 15m)", movies.size());
                    } catch (Exception e) {
                        log.debug("Redis movie cache save skipped: {}", e.getMessage());
                    }
                }
                return movies;
            } catch (Exception e) {
                log.warn("Error reading movies from PostgreSQL, falling back to local store: {}", e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    @Override
    public Optional<Movie> getMovieById(Long id) {
        if (id == null) return Optional.empty();

        // Fast-path: check distributed Redis cache for movie details
        String cacheKey = REDIS_KEY_MOVIE_PREFIX + id;
        if (redisTemplate != null) {
            try {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null && !cached.isBlank()) {
                    Movie movie = JsonUtils.fromJson(cached, Movie.class);
                    if (movie != null) {
                        log.debug("[Redis Cache HIT] Retrieved movie {} ('{}') from Redis in <2ms", id, movie.getTitle());
                        return Optional.of(movie);
                    }
                }
            } catch (Exception e) {
                log.debug("Redis movie detail check skipped: {}", e.getMessage());
            }
        }

        if (jdbcTemplate != null) {
            try {
                List<Movie> list = jdbcTemplate.query(SELECT_MOVIE_BY_ID, this::mapRow, id);
                if (!list.isEmpty()) {
                    Movie movie = list.get(0);
                    if (redisTemplate != null) {
                        try {
                            redisTemplate.opsForValue().set(cacheKey, JsonUtils.toJson(movie), MOVIE_CACHE_TTL);
                        } catch (Exception ignored) {}
                    }
                    return Optional.of(movie);
                }
                return Optional.empty();
            } catch (Exception e) {
                log.warn("Error reading movie {} from PostgreSQL: {}", id, e.getMessage());
            }
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public Movie createMovie(Movie movie) {
        if (movie.getId() == null) {
            movie.setId(idSequence.incrementAndGet());
        }
        if (movie.getReleaseDate() != null && !movie.getReleaseDate().isBlank()) {
            try {
                if (movie.getYear() == null) {
                    movie.setYear(Integer.parseInt(movie.getReleaseDate().substring(0, 4)));
                }
            } catch (Exception ignored) {}
        } else if (movie.getYear() != null) {
            movie.setReleaseDate(movie.getYear() + "-01-01");
        } else {
            int currentYear = java.time.LocalDate.now().getYear();
            movie.setYear(currentYear);
            movie.setReleaseDate(java.time.LocalDate.now().toString());
        }
        if (movie.getSuggestedSeats() == null) {
            movie.setSuggestedSeats(Collections.emptyList());
        }
        if (movie.getStatus() == null) {
            movie.setStatus("NOW_SHOWING");
        }
        if (movie.getOccupancyRate() == null) {
            movie.setOccupancyRate(0);
        }
        if (movie.getPosterUrl() == null) {
            movie.setPosterUrl("");
        }
        if (movie.getRottenTomatoes() == null) {
            movie.setRottenTomatoes(0);
        }
        if (movie.getMetacritic() == null) {
            movie.setMetacritic(0);
        }
        if (movie.getImdbRating() == null) {
            movie.setImdbRating(0.0);
        }
        if (movie.getCriticConsensus() == null) {
            movie.setCriticConsensus("");
        }
        if (movie.getTopCriticQuote() == null) {
            movie.setTopCriticQuote("");
        }
        if (movie.getReviewsCount() == null) {
            movie.setReviewsCount(0);
        }
        if (movie.getTrailerUrl() != null && !movie.getTrailerUrl().isBlank()) {
            movie.setTrailerUrl(MovieCatalogService.normalizeTrailerUrl(movie.getTrailerUrl()));
        } else {
            movie.setTrailerUrl("");
        }
        if (movie.getDirector() == null) {
            movie.setDirector("");
        }
        if (movie.getCast() == null) {
            movie.setCast("");
        }
        if (movie.getAgeRating() == null || movie.getAgeRating().isBlank()) {
            movie.setAgeRating("PG-13");
        }
        if (jdbcTemplate != null) {
            saveMovieToDatabase(movie);
            evictMovieCaches(movie.getId());
            log.info("Created movie: id={}, title='{}'", movie.getId(), movie.getTitle());
        }
        return movie;
    }

    @Override
    @Transactional
    public Optional<Movie> updateMovie(Long id, Movie updated) {
        if (id == null || updated == null) {
            return Optional.empty();
        }
        updated.setId(id);
        if (jdbcTemplate != null) {
            Integer count = jdbcTemplate.queryForObject(COUNT_MOVIE_BY_ID, Integer.class, id);
            if (count == null || count == 0) {
                return Optional.empty();
            }
            saveMovieToDatabase(updated);
            evictMovieCaches(id);
            log.info("Updated movie: id={}, title='{}'", id, updated.getTitle());
            return Optional.of(updated);
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public boolean deleteMovie(Long id) {
        if (id == null) return false;
        if (jdbcTemplate != null) {
            int rows = jdbcTemplate.update(DELETE_MOVIE_BY_ID, id);
            if (rows > 0) {
                evictMovieCaches(id);
                log.info("Deleted movie: id={}", id);
                return true;
            }
        }
        return false;
    }

    @Override
    public Movie aiDraftMovie(String title, String genreHint) {
        String prompt = String.format(
                "You are an executive cinema programming director. Generate a professional movie catalog entry for the title: '%s' (Genre hint: '%s').\n" +
                "Respond strictly with 4 concise lines in format:\n" +
                "GENRE: <Genre>\n" +
                "DURATION: <e.g. 2h 15m>\n" +
                "PRICE: <e.g. 16.50>\n" +
                "SYNOPSIS: <2-sentence compelling theatrical synopsis>",
                title, genreHint != null ? genreHint : "Cinematic"
        );

        String genre = genreHint != null && !genreHint.isBlank() ? genreHint : "Sci-Fi / Action";
        String duration = "2h 18m";
        double price = 17.50;
        String synopsis = String.format("A visionary cinematic release featuring %s, delivering grand spectacle and emotional resonance on the giant screen.", title);

        ChatClient client = (groqChatClient != null) ? groqChatClient : geminiChatClient;
        if (client != null) {
            try {
                String aiResponse = client.prompt()
                        .user(prompt)
                        .call()
                        .content();

                if (aiResponse != null) {
                    for (String line : aiResponse.split("\n")) {
                        String trimmed = line.trim();
                        if (trimmed.startsWith("GENRE:")) {
                            genre = trimmed.substring(6).trim();
                        } else if (trimmed.startsWith("DURATION:")) {
                            duration = trimmed.substring(9).trim();
                        } else if (trimmed.startsWith("PRICE:")) {
                            try {
                                price = Double.parseDouble(trimmed.substring(6).replaceAll("[^0-9.]", ""));
                            } catch (Exception ignored) {}
                        } else if (trimmed.startsWith("SYNOPSIS:")) {
                            synopsis = trimmed.substring(9).trim();
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("AI generation fallback used for draft '{}': {}", title, e.getMessage());
            }
        }

        List<Auditorium> circuitAuds = getAuditoriums();
        String defaultAud = (!circuitAuds.isEmpty()) ? circuitAuds.get(0).name() : "";
        int currentYear = java.time.LocalDate.now().getYear();

        return Movie.builder()
                .title(title)
                .genre(genre != null && !genre.isBlank() ? genre : "General")
                .duration(duration != null && !duration.isBlank() ? duration : "")
                .price(price > 0 ? price : 18.0)
                .synopsis(synopsis != null ? synopsis : "")
                .rating(0.0)
                .year(currentYear)
                .releaseDate(java.time.LocalDate.now().plusWeeks(4).toString())
                .aiPick(false)
                .auditorium(defaultAud)
                .status("COMING_SOON")
                .occupancyRate(0)
                .suggestedSeats(Collections.emptyList())
                .posterUrl("")
                .showtimes("")
                .rottenTomatoes(0)
                .metacritic(0)
                .imdbRating(0.0)
                .criticConsensus("")
                .topCriticQuote("")
                .reviewsCount(0)
                .trailerUrl("")
                .director("")
                .cast("")
                .ageRating("PG-13")
                .build();
    }

    @Override
    @Transactional
    public List<Movie> ingestCurrentYearMovies(int targetYear) {
        int year = (targetYear >= 2024 && targetYear <= 2030) ? targetYear : java.time.LocalDate.now().getYear();
        if (jdbcTemplate != null) {
            try {
                List<Movie> existing = jdbcTemplate.query(
                        BASE_SELECT_ALL + " AND year = ? ORDER BY id ASC",
                        this::mapRow,
                        year
                );
                log.info("Querying movies for year {}: found {} titles in PostgreSQL SSOT", year, existing.size());
                return existing;
            } catch (Exception e) {
                log.error("Failed to query movies for year {}: {}", year, e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    @Override
    public List<Auditorium> getAuditoriums() {
        if (jdbcTemplate != null) {
            try {
                return jdbcTemplate.query(
                        "SELECT id, cinema_id, name, format, capacity, surge_multiplier, perk, sound_system FROM auditoriums ORDER BY id",
                        (rs, rowNum) -> new Auditorium(
                                rs.getString("id"),
                                rs.getString("cinema_id"),
                                rs.getString("name"),
                                rs.getString("format"),
                                rs.getInt("capacity"),
                                rs.getDouble("surge_multiplier"),
                                rs.getString("perk"),
                                rs.getString("sound_system")
                        )
                );
            } catch (Exception e) {
                log.warn("Error reading auditoriums from PostgreSQL: {}", e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    @Override
    public List<CinemaVenue> getCinemas() {
        if (jdbcTemplate != null) {
            try {
                List<Auditorium> allAuditoriums = getAuditoriums();
                return jdbcTemplate.query(
                        "SELECT id, name, short_name, neighborhood, distance, address, features FROM cinemas ORDER BY id",
                        (rs, rowNum) -> {
                            String cinemaId = rs.getString("id");
                            java.sql.Array featuresArray = rs.getArray("features");
                            List<String> features = featuresArray != null 
                                    ? Arrays.asList((String[]) featuresArray.getArray())
                                    : Collections.emptyList();
                            List<Auditorium> screens = allAuditoriums.stream()
                                    .filter(a -> cinemaId.equals(a.cinemaId()))
                                    .toList();
                            return new CinemaVenue(
                                    cinemaId,
                                    rs.getString("name"),
                                    rs.getString("short_name"),
                                    rs.getString("neighborhood"),
                                    rs.getString("distance"),
                                    rs.getString("address"),
                                    features,
                                    screens
                            );
                        }
                );
            } catch (Exception e) {
                log.warn("Error reading cinemas from PostgreSQL: {}", e.getMessage());
            }
        }
        return Collections.emptyList();
    }
}
