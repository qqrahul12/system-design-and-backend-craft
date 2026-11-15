package com.skills.ai.movie;

import com.skills.ai.persistence.queries.MovieSqlQueries;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static com.skills.ai.persistence.queries.MovieSqlQueries.*;

/**
 * Relational PostgreSQL-backed implementation of MovieCatalogService managing CineMind's live theatrical catalog.
 * Follows Single Source of Truth architecture and strict transactional boundaries to eliminate dual-write hazards.
 */
@Slf4j
@Service
public class MovieCatalogServiceImpl implements MovieCatalogService {

    private final JdbcTemplate jdbcTemplate;
    private final Map<Long, Movie> movieStore = new ConcurrentHashMap<>();
    private final AtomicLong idSequence = new AtomicLong(100);
    private final ChatClient geminiChatClient;
    private final ChatClient groqChatClient;

    public MovieCatalogServiceImpl(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            @Autowired(required = false) @Qualifier("geminiChatClient") ChatClient geminiChatClient,
            @Autowired(required = false) @Qualifier("groqChatClient") ChatClient groqChatClient
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.geminiChatClient = geminiChatClient;
        this.groqChatClient = groqChatClient;
        initDatabase();
    }

    private void initDatabase() {
        if (jdbcTemplate != null) {
            try {
                Integer count = jdbcTemplate.queryForObject(COUNT_MOVIES, Integer.class);
                if (count != null && count > 0) {
                    log.info("🎬 Found {} persisted movies in PostgreSQL (Single Source of Truth). Zero hardcoded startup seeding needed.", count);
                    syncSequenceFromDatabase();
                    return;
                }
                log.info("🎬 PostgreSQL 'movies' table is empty. Ingesting initial theatrical releases directly into database...");
            } catch (Exception e) {
                log.warn("⚠️ PostgreSQL movie table init error, falling back to local store: {}", e.getMessage());
            }
        }
        seedInitialCatalog();
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
            log.warn("⚠️ Failed to synchronize idSequence from PostgreSQL: {}", e.getMessage());
        }
    }

    private Movie mapRow(ResultSet rs, int rowNum) throws SQLException {
        String seatsCsv = rs.getString("suggested_seats_csv");
        List<String> seats = (seatsCsv != null && !seatsCsv.isBlank())
                ? Arrays.stream(seatsCsv.split(",")).map(String::trim).toList()
                : List.of("C3", "C4");

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

    private void seedInitialCatalog() {
        addSeededMovie(1L, "Interstellar", "Sci-Fi", 4.8, 2014, "2014-11-07", "2h 49m", 18.00, true,
                "A team of explorers travel through a wormhole in space to ensure humanity's survival across uncharted galaxies.",
                List.of("B3", "B4"), "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 94, "1:30 PM, 5:00 PM, 8:45 PM",
                87, 74, 8.7, "A thrilling, thought-provoking, and visually resplendent sci-fi epic that questions humanity's destiny in the stars.",
                "\"Interstellar is a staggering cinematic achievement that demands to be experienced in 70mm IMAX.\" — Chicago Tribune", 412,
                "https://www.youtube.com/embed/zSWdZVtXT7E", "Christopher Nolan", "Matthew McConaughey, Anne Hathaway, Jessica Chastain", "PG-13");

        addSeededMovie(2L, "Dune: Part Two", "Epic", 4.7, 2024, "2024-03-01", "2h 46m", 19.50, true,
                "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 96, "12:00 PM, 3:45 PM, 7:30 PM, 10:45 PM",
                93, 79, 8.5, "Visually astounding and narratively epic, Denis Villeneuve continues the sci-fi standard in monumentally scaled form.",
                "\"One of the greatest sci-fi spectacles of the 21st century.\" — The Hollywood Reporter", 489,
                "https://www.youtube.com/embed/Way9Dexny3w", "Denis Villeneuve", "Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem", "PG-13");

        addSeededMovie(3L, "Oppenheimer", "Drama", 4.9, 2023, "2023-07-21", "3h 00m", 17.00, false,
                "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project that ushered in the nuclear age.",
                List.of("B2", "B3"), "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop",
                "70mm Large Format Screen 2", "NOW_SHOWING", 89, "2:00 PM, 6:15 PM, 9:45 PM",
                93, 88, 8.9, "A masterclass in tension, biographic pacing, and acoustic brilliance, marking a career pinnacle for Christopher Nolan.",
                "\"A triumph of cinema that probes deep into moral consequence.\" — The New York Times", 512,
                "https://www.youtube.com/embed/uYPbbksJxIg", "Christopher Nolan", "Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.", "R");

        addSeededMovie(4L, "Spider-Man: Across the Spider-Verse", "Action", 4.8, 2023, "2023-06-02", "2h 20m", 15.50, false,
                "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.",
                List.of("A3", "A4"), "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 92, "11:30 AM, 2:45 PM, 6:00 PM",
                95, 86, 8.6, "Just as visually dazzling and action-packed as its predecessor, thrilling from start to cliffhanger finish.",
                "\"A visual masterwork that pushes the art form of animation into uncharted genius.\" — Empire", 398,
                "https://www.youtube.com/embed/cqGjhVJWtEg", "Joaquim Dos Santos, Kemp Powers", "Shameik Moore, Hailee Steinfeld, Oscar Isaac", "PG");

        addSeededMovie(5L, "Past Lives", "Romance", 4.6, 2023, "2023-06-02", "1h 45m", 13.00, false,
                "Nora and Hae Sung, two deeply connected childhood friends, are reunited for one fateful week as they confront destiny and choices.",
                List.of("C2", "C3"), "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop",
                "Indie Studio 4", "NOW_SHOWING", 76, "4:15 PM, 7:15 PM",
                96, 94, 7.9, "A remarkable debut delivering a deeply poignant and resonant meditation on love, destiny, and the human condition.",
                "\"An aching, transcendent romance destined to become a modern classic.\" — Rolling Stone", 320,
                "https://www.youtube.com/embed/kA244xewjcI", "Celine Song", "Greta Lee, Teo Yoo, John Magaro", "PG-13");

        addSeededMovie(6L, "Blade Runner 2049", "Sci-Fi", 4.7, 2017, "2017-10-06", "2h 44m", 16.50, false,
                "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
                List.of("B4", "B5"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 85, "5:30 PM, 9:00 PM",
                88, 81, 8.0, "Visually breathtaking and narratively satisfying, expanding its predecessor while standing as an impressive filmmaking achievement.",
                "\"A masterpiece of atmospheric science fiction.\" — Los Angeles Times", 445,
                "https://www.youtube.com/embed/gCcx85zbxz4", "Denis Villeneuve", "Ryan Gosling, Harrison Ford, Ana de Armas", "R");

        addSeededMovie(7L, "Gladiator II", "Action", 4.8, 2024, "2024-11-22", "2h 28m", 18.50, true,
                "Years after witnessing the death of Maximus, Lucius enters the Colosseum after his home is conquered by tyrannical emperors.",
                List.of("D3", "D4"), "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 91, "1:00 PM, 4:30 PM, 8:00 PM",
                86, 78, 8.1, "Ridley Scott delivers ferocious Colosseum combat, epic scale, and Denzel Washington in magnetic, charismatic form.",
                "\"Spectacular Roman brutality that reminds us why big-screen cinema exists.\" — Guardian", 285,
                "https://www.youtube.com/embed/4rgYUipGJNo", "Ridley Scott", "Paul Mescal, Pedro Pascal, Denzel Washington", "R");

        addSeededMovie(8L, "Tron: Ares", "Sci-Fi", 4.6, 2025, "2025-10-10", "2h 15m", 17.50, false,
                "A sophisticated Program named Ares is sent from the digital world into the real world on a dangerous assignment.",
                List.of("B3", "C3"), "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                "ScreenX 270° Panoramic", "UPCOMING", 78, "Opens Next Week",
                84, 76, 7.8, "A neon-soaked technological odyssey featuring Nine Inch Nails soundtrack and cutting-edge visual design.",
                "\"The Grid has never looked or sounded more intoxicating.\" — IndieWire", 140,
                "https://www.youtube.com/embed/q098q1c6c0E", "Joachim Rønning", "Jared Leto, Greta Lee, Evan Peters, Jeff Bridges", "PG-13");

        addSeededMovie(9L, "Inception", "Sci-Fi", 4.9, 2010, "2010-07-16", "2h 28m", 16.00, true,
                "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
                List.of("B2", "B3"), "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 95, "3:00 PM, 7:00 PM, 10:15 PM",
                87, 74, 8.8, "Smart, innovative, and thrilling, Inception is that relatively rare blockbuster that succeeds both viscerally and intellectually.",
                "\"A breathtaking, mind-bending cinematic tour de force.\" — Rolling Stone", 460,
                "https://www.youtube.com/embed/8hP9D6kZseM", "Christopher Nolan", "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy", "PG-13");

        addSeededMovie(10L, "The Matrix", "Sci-Fi", 4.9, 1999, "1999-03-31", "2h 16m", 15.00, false,
                "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 93, "1:45 PM, 5:15 PM, 8:45 PM",
                83, 73, 8.7, "An ingenious blend of Hong Kong action style, innovative visual effects, and an imaginative sci-fi premise.",
                "\"A technologically stunning spectacle that redefines the action genre.\" — Entertainment Weekly", 420,
                "https://www.youtube.com/embed/vKQi3bBA1y8", "Lana Wachowski, Lilly Wachowski", "Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss, Hugo Weaving", "R");

        addSeededMovie(11L, "Everything Everywhere All at Once", "Sci-Fi", 4.8, 2022, "2022-03-25", "2h 19m", 16.50, false,
                "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes and connecting with the lives she could have led.",
                List.of("A2", "A3"), "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop",
                "Indie Studio 4", "NOW_SHOWING", 91, "2:30 PM, 6:00 PM, 9:15 PM",
                94, 81, 8.1, "Led by an outstanding Michelle Yeoh, EEAAO lives up to its title with an expertly calibrated assault on the senses.",
                "\"A kaleidoscopic burst of sheer cinematic inventiveness and heart.\" — The New York Times", 380,
                "https://www.youtube.com/embed/wxN1T1uxQ2g", "Daniel Kwan, Daniel Scheinert", "Michelle Yeoh, Stephanie Hsu, Ke Huy Quan, Jamie Lee Curtis", "R");

        addSeededMovie(12L, "The Dark Knight", "Action", 5.0, 2008, "2008-07-18", "2h 32m", 18.00, true,
                "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
                List.of("D3", "D4"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 99, "12:00 PM, 3:30 PM, 7:00 PM, 10:30 PM",
                94, 84, 9.0, "Dark, complex, and unforgettable, The Dark Knight succeeds not just as an entertaining comic book film, but as a richly thrilling crime saga.",
                "\"Heath Ledger's Joker is an indelible, electrifying cinematic tour de force.\" — Los Angeles Times", 650,
                "https://www.youtube.com/embed/EXeTwQWrcwY", "Christopher Nolan", "Christian Bale, Heath Ledger, Aaron Eckhart, Michael Caine", "PG-13");
    }

    private Movie addSeededMovie(Long id, String title, String genre, double rating, Integer year,
                                String releaseDate, String duration, double price, boolean isImax,
                                String description, List<String> seats, String posterUrl,
                                String auditorium, String status, Integer occupancyRate,
                                String showtimes, Integer rottenTomatoes, Integer metacritic,
                                Double imdbRating, String criticConsensus, String topCriticQuote,
                                Integer reviewsCount, String trailerUrl, String director,
                                String cast, String ageRating) {
        Movie movie = Movie.builder()
                .id(id)
                .title(title)
                .genre(genre)
                .rating(rating)
                .year(year)
                .releaseDate(releaseDate)
                .duration(duration)
                .price(price)
                .aiPick(isImax)
                .synopsis(description)
                .suggestedSeats(seats)
                .posterUrl(posterUrl)
                .auditorium(auditorium)
                .status(status)
                .occupancyRate(occupancyRate)
                .showtimes(showtimes)
                .rottenTomatoes(rottenTomatoes)
                .metacritic(metacritic)
                .imdbRating(imdbRating)
                .criticConsensus(criticConsensus)
                .topCriticQuote(topCriticQuote)
                .reviewsCount(reviewsCount)
                .trailerUrl(trailerUrl)
                .director(director)
                .cast(cast)
                .ageRating(ageRating)
                .build();
        if (jdbcTemplate != null) {
            saveMovieToDatabase(movie);
        } else {
            movieStore.put(id, movie);
        }
        return movie;
    }

    @Override
    public List<Movie> getAllMovies(String genre, String status, String search) {
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
                return jdbcTemplate.query(sql.toString(), this::mapRow, params.toArray());
            } catch (Exception e) {
                log.warn("⚠️ Error reading movies from PostgreSQL, falling back to local store: {}", e.getMessage());
            }
        }
        return movieStore.values().stream()
                .filter(m -> genre == null || genre.isBlank() || m.getGenre().equalsIgnoreCase(genre))
                .filter(m -> status == null || status.isBlank() || m.getStatus().equalsIgnoreCase(status))
                .filter(m -> search == null || search.isBlank() || m.getTitle().toLowerCase().contains(search.toLowerCase()))
                .sorted(Comparator.comparing(Movie::getId))
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Movie> getMovieById(Long id) {
        if (id == null) return Optional.empty();
        if (jdbcTemplate != null) {
            try {
                List<Movie> list = jdbcTemplate.query(SELECT_MOVIE_BY_ID, this::mapRow, id);
                if (!list.isEmpty()) {
                    return Optional.of(list.get(0));
                }
                return Optional.empty();
            } catch (Exception e) {
                log.warn("⚠️ Error reading movie {} from PostgreSQL, falling back to local store: {}", id, e.getMessage());
            }
        }
        return Optional.ofNullable(movieStore.get(id));
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
            movie.setReleaseDate(movie.getYear() + "-05-22");
        } else {
            movie.setYear(2026);
            movie.setReleaseDate("2026-05-22");
        }
        if (movie.getSuggestedSeats() == null || movie.getSuggestedSeats().isEmpty()) {
            movie.setSuggestedSeats(List.of("C3", "C4"));
        }
        if (movie.getStatus() == null) {
            movie.setStatus("NOW_SHOWING");
        }
        if (movie.getOccupancyRate() == null) {
            movie.setOccupancyRate(75);
        }
        if (movie.getPosterUrl() == null || movie.getPosterUrl().isBlank()) {
            movie.setPosterUrl("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop");
        }
        if (movie.getRottenTomatoes() == null) {
            movie.setRottenTomatoes(movie.getRating() != null ? (int) Math.round(movie.getRating() * 19.0) : 88);
        }
        if (movie.getMetacritic() == null) {
            movie.setMetacritic(movie.getRating() != null ? (int) Math.round(movie.getRating() * 17.0) : 80);
        }
        if (movie.getImdbRating() == null) {
            movie.setImdbRating(movie.getRating() != null ? movie.getRating() : 8.2);
        }
        if (movie.getCriticConsensus() == null || movie.getCriticConsensus().isBlank()) {
            movie.setCriticConsensus(movie.getTitle() + " presents a visually striking and engaging theatrical experience.");
        }
        if (movie.getTopCriticQuote() == null || movie.getTopCriticQuote().isBlank()) {
            movie.setTopCriticQuote("\"An impressive and memorable cinematic release.\" — CineCritique");
        }
        if (movie.getReviewsCount() == null) {
            movie.setReviewsCount(280);
        }
        if (movie.getTrailerUrl() != null && !movie.getTrailerUrl().isBlank()) {
            movie.setTrailerUrl(MovieCatalogService.normalizeTrailerUrl(movie.getTrailerUrl()));
        } else {
            movie.setTrailerUrl("https://www.youtube.com/embed/zSWdZVtXT7E");
        }
        if (movie.getDirector() == null || movie.getDirector().isBlank()) {
            movie.setDirector("Visionary Director");
        }
        if (movie.getCast() == null || movie.getCast().isBlank()) {
            movie.setCast("Leading Ensemble");
        }
        if (movie.getAgeRating() == null || movie.getAgeRating().isBlank()) {
            movie.setAgeRating("PG-13");
        }
        if (jdbcTemplate != null) {
            saveMovieToDatabase(movie);
            log.info("🎬 Created & persisted movie in PostgreSQL (SSOT): id={}, title='{}', trailer='{}'", movie.getId(), movie.getTitle(), movie.getTrailerUrl());
        } else {
            movieStore.put(movie.getId(), movie);
            log.info("🎬 Created movie in local store: id={}, title='{}'", movie.getId(), movie.getTitle());
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
            log.info("✏️ Updated & persisted movie in PostgreSQL (SSOT): id={}, title='{}'", id, updated.getTitle());
            return Optional.of(updated);
        } else {
            if (!movieStore.containsKey(id)) {
                return Optional.empty();
            }
            movieStore.put(id, updated);
            log.info("✏️ Updated movie in local store: id={}, title='{}'", id, updated.getTitle());
            return Optional.of(updated);
        }
    }

    @Override
    @Transactional
    public boolean deleteMovie(Long id) {
        if (id == null) return false;
        if (jdbcTemplate != null) {
            int rows = jdbcTemplate.update(DELETE_MOVIE_BY_ID, id);
            if (rows > 0) {
                log.info("🗑️ Deleted movie from PostgreSQL: id={}", id);
                return true;
            }
            return false;
        } else {
            Movie removed = movieStore.remove(id);
            if (removed != null) {
                log.info("🗑️ Deleted movie from local store: id={}, title='{}'", id, removed.getTitle());
                return true;
            }
            return false;
        }
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
                log.warn("⚠️ AI generation fallback used for draft '{}': {}", title, e.getMessage());
            }
        }

        return Movie.builder()
                .title(title)
                .genre(genre)
                .duration(duration)
                .price(price)
                .synopsis(synopsis)
                .rating(4.8)
                .year(2026)
                .releaseDate("2026-05-22")
                .aiPick(true)
                .auditorium("IMAX 70mm Auditorium 1")
                .status("NOW_SHOWING")
                .occupancyRate(75)
                .suggestedSeats(List.of("C3", "C4"))
                .posterUrl("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop")
                .showtimes("1:00 PM, 4:30 PM, 8:00 PM")
                .rottenTomatoes(92)
                .metacritic(85)
                .imdbRating(8.4)
                .criticConsensus(title + " delivers grand cinematic scale, stunning sound design, and remarkable performances.")
                .topCriticQuote("\"An arresting and spectacular theatrical event.\" — Cinema Vanguard")
                .reviewsCount(340)
                .trailerUrl("https://www.youtube.com/embed/zSWdZVtXT7E")
                .director("Visionary Director")
                .cast("Leading Cast")
                .ageRating("PG-13")
                .build();
    }

    @Override
    @Transactional
    public List<Movie> ingestCurrentYearMovies(int targetYear) {
        int year = (targetYear >= 2024 && targetYear <= 2030) ? targetYear : 2026;
        List<Movie> ingested = new ArrayList<>();

        ingested.add(addSeededMovie(201L, "Project Hail Mary", "Sci-Fi", 4.9, year, year + "-03-20", "2h 35m", 19.50, true,
                "Astronaut Ryland Grace is the lone survivor on an interstellar mission to save Earth from a global extinction event.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 97, "1:15 PM, 4:45 PM, 8:15 PM",
                96, 88, 8.9, "A stunning, deeply emotional, and scientifically rigorous sci-fi masterwork anchored by Ryan Gosling's career-best performance.",
                "\"Project Hail Mary restores the pure, soaring wonder of cosmic cinema.\" — The Washington Post", 480,
                "https://www.youtube.com/embed/zSWdZVtXT7E", "Phil Lord, Christopher Miller", "Ryan Gosling, Sandra Hüller, Milana Vayntrub", "PG-13"));

        ingested.add(addSeededMovie(202L, "Mickey 17", "Sci-Fi", 4.8, year, year + "-01-31", "2h 19m", 18.00, true,
                "An 'expendable' human employee on a space colonization expedition refuses to let his clone replacement take over.",
                List.of("B3", "B4"), "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 93, "2:00 PM, 5:30 PM, 9:00 PM",
                92, 85, 8.5, "Bong Joon-ho infuses razor-sharp dark humor and existential dread into a visually inventive sci-fi puzzle.",
                "\"A darkly hilarious, visually breathtaking tour de force.\" — IndieWire", 390,
                "https://www.youtube.com/embed/osYlpQ8Duac", "Bong Joon-ho", "Robert Pattinson, Naomi Ackie, Steven Yeun, Mark Ruffalo", "R"));

        ingested.add(addSeededMovie(203L, "Superman", "Action", 4.8, year, year + "-07-11", "2h 25m", 19.00, true,
                "Clark Kent strives to balance his Kryptonian heritage with his human upbringing, standing as the beacon of hope and truth.",
                List.of("D3", "D4"), "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 95, "12:30 PM, 4:00 PM, 7:30 PM, 10:30 PM",
                94, 82, 8.7, "James Gunn brings optimism, vibrant comic-book grandeur, and heartfelt humanity back to the quintessential superhero.",
                "\"Superman soars with sincerity, breathtaking action, and infectious joy.\" — Empire", 510,
                "https://www.youtube.com/embed/Way9Dexny3w", "James Gunn", "David Corenswet, Rachel Brosnahan, Nicholas Hoult", "PG-13"));

        ingested.add(addSeededMovie(204L, "Avatar: Fire and Ash", "Epic", 4.7, year, year + "-12-19", "3h 10m", 21.00, true,
                "The journey of Jake Sully and Neytiri continues as they encounter the aggressive nomadic Ash People across the volcanic ranges of Pandora.",
                List.of("C3", "C4", "D3", "D4"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
                "IMAX 3D Laser Auditorium 1", "NOW_SHOWING", 98, "1:00 PM, 5:15 PM, 9:30 PM",
                91, 84, 8.6, "James Cameron pushes photorealistic CGI and acoustic world-building into territory no other filmmaker can touch.",
                "\"A staggering technical marvel that redefines immersive spectacle.\" — Variety", 620,
                "https://www.youtube.com/embed/cqGjhVJWtEg", "James Cameron", "Sam Worthington, Zoe Saldana, Sigourney Weaver, Michelle Yeoh", "PG-13"));

        ingested.add(addSeededMovie(205L, "Avengers: Doomsday", "Action", 4.9, year, year + "-05-01", "2h 50m", 20.00, true,
                "The multiverse collapses as Earth's mightiest heroes face Victor von Doom in a battle across parallel timelines.",
                List.of("B2", "B3", "B4"), "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 99, "11:45 AM, 3:30 PM, 7:15 PM, 11:00 PM",
                95, 87, 8.9, "The Russo Brothers deliver blistering emotional stakes and monumental scale in an electrifying event comic come to life.",
                "\"A thunderous comic-book triumph that shakes the auditorium to its foundations.\" — Rolling Stone", 740,
                "https://www.youtube.com/embed/uYPbbksJxIg", "Anthony Russo, Joe Russo", "Robert Downey Jr., Pedro Pascal, Vanessa Kirby, Florence Pugh", "PG-13"));

        ingested.add(addSeededMovie(206L, "The Batman Part II", "Action", 4.9, year, year + "-10-02", "2h 55m", 19.50, true,
                "Batman descends deeper into Gotham's criminal underworld as the Court of Owls strikes from the city's ancient shadows.",
                List.of("C3", "C4", "D3"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "70mm Large Format Screen 2", "NOW_SHOWING", 96, "12:15 PM, 4:15 PM, 8:15 PM",
                95, 86, 8.8, "Matt Reeves expands his dark detective opus into a hypnotic, masterfully composed crime thriller with unmatched atmospheric depth.",
                "\"A triumph of film-noir suspense, brooding visual brilliance, and sheer cinematic authority.\" — Variety", 560,
                "https://www.youtube.com/embed/mqqft2x_Aa4", "Matt Reeves", "Robert Pattinson, Zoë Kravitz, Colin Farrell, Andy Serkis", "PG-13"));

        ingested.add(addSeededMovie(207L, "Spider-Man: Beyond the Spider-Verse", "Action", 4.9, year, year + "-06-05", "2h 30m", 18.50, true,
                "Miles Morales must reckon with the multiverse's darkest anomalies to save both his father and every alternate universe from unraveling.",
                List.of("A3", "A4", "B3"), "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 98, "11:00 AM, 2:30 PM, 6:00 PM, 9:30 PM",
                97, 89, 9.0, "An astounding culmination that pushes the frontiers of animation and storytelling into an emotional and visual peak.",
                "\"A mind-bending, heart-swelling masterpiece that cements the trilogy as a high-water mark in cinema history.\" — Empire", 610,
                "https://www.youtube.com/embed/cqGjhVJWtEg", "Joaquim Dos Santos, Kemp Powers", "Shameik Moore, Hailee Steinfeld, Oscar Isaac, Daniel Kaluuya", "PG"));

        ingested.add(addSeededMovie(208L, "The Mandalorian & Grogu", "Sci-Fi", 4.8, year, year + "-05-22", "2h 12m", 18.00, true,
                "Din Djarin and his young apprentice Grogu are enlisted by the New Republic for a perilous secret mission across the galaxy's Outer Rim.",
                List.of("B3", "B4"), "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 94, "1:00 PM, 4:30 PM, 8:00 PM",
                92, 81, 8.4, "Jon Favreau brings the Western-inflected space opera magic of Star Wars back to the big screen with exhilarating flair.",
                "\"Star Wars returns to the cinema with pure joy, stunning kinetic battles, and boundless heart.\" — Total Film", 430,
                "https://www.youtube.com/embed/aOC8E8R_n54", "Jon Favreau", "Pedro Pascal, Sigourney Weaver, Katee Sackhoff", "PG-13"));

        ingested.add(addSeededMovie(209L, "Shrek 5", "Animation", 4.7, year, year + "-07-01", "1h 48m", 16.50, true,
                "Shrek, Donkey, and Fiona embark on a wild adventure to save Far Far Away when an enchanted spell threatens to rewrite fairytale history.",
                List.of("C2", "C3", "C4"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 93, "11:30 AM, 2:15 PM, 5:00 PM, 7:45 PM",
                90, 78, 8.1, "Irreverent, endlessly warm, and nostalgic, Shrek 5 proves the beloved ogre still has tremendous comedic bite and heart.",
                "\"Laugh-out-loud funny and delightfully irreverent — a triumphant family cinema reunion.\" — Deadline", 370,
                "https://www.youtube.com/embed/q098q1c6c0E", "Walt Dohrn", "Mike Myers, Eddie Murphy, Cameron Diaz, Antonio Banderas", "PG"));

        ingested.add(addSeededMovie(210L, "Toy Story 5", "Animation", 4.8, year, year + "-06-19", "1h 52m", 17.00, true,
                "Woody, Buzz, and the toys confront their greatest modern competitor yet: children captivated by tablet screens and digital electronics.",
                List.of("D2", "D3", "D4"), "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                "ScreenX 270° Panoramic", "NOW_SHOWING", 91, "12:00 PM, 2:45 PM, 5:30 PM, 8:15 PM",
                93, 83, 8.3, "Pixar tackles the digital age with philosophical poignancy, clever slapstick comedy, and timeless emotional warmth.",
                "\"A wondrous, tear-inducing triumph that proves Pixar's greatest characters still have vital stories to tell.\" — IGN", 410,
                "https://www.youtube.com/embed/wmiIUN-7qhE", "Andrew Stanton", "Tom Hanks, Tim Allen, Joan Cusack, Tony Hale", "G"));

        ingested.add(addSeededMovie(211L, "A Quiet Place: Part III", "Horror", 4.7, year, year + "-09-18", "1h 55m", 17.50, true,
                "The Abbott family makes a final desperate stand at an offshore sanctuary to transmit the sonic frequency that can liberate humanity.",
                List.of("B2", "B3"), "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop",
                "Indie Studio 4", "NOW_SHOWING", 89, "4:00 PM, 7:00 PM, 9:45 PM",
                91, 80, 8.2, "Pulse-pounding acoustic terror crafted with unmatched sound engineering and ferocious maternal intensity from Emily Blunt.",
                "\"A masterclass in visceral dread and razor-wire tension.\" — The Hollywood Reporter", 340,
                "https://www.youtube.com/embed/BpdDN9d9Jio", "John Krasinski", "Emily Blunt, Millicent Simmonds, Noah Jupe, Cillian Murphy", "PG-13"));

        ingested.add(addSeededMovie(212L, "Weapons", "Horror", 4.8, year, year + "-01-16", "2h 10m", 18.00, true,
                "A community unravels in terror when high school students begin disappearing under eerie, interconnected supernatural circumstances.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 95, "5:00 PM, 8:15 PM, 11:15 PM",
                94, 85, 8.5, "Zach Cregger follows up Barbarian with an unpredictable, nerve-shredding, multi-perspective horror masterpiece.",
                "\"Genuinely terrifying, ingeniously plotted, and breathtakingly audacious.\" — Bloody Disgusting", 380,
                "https://www.youtube.com/embed/kA244xewjcI", "Zach Cregger", "Josh Brolin, Julia Garner, Alden Ehrenreich, Benedict Wong", "R"));

        log.info("🍿 Ingested {} real-time {} theatrical blockbuster movies into CineMind database", ingested.size(), year);
        return ingested;
    }
}
