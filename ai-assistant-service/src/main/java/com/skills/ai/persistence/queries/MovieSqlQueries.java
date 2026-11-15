package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for Theatrical Movie Catalog operations.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class MovieSqlQueries {

    private MovieSqlQueries() {}

    public static final String COUNT_MOVIES =
            "SELECT COUNT(*) FROM movies";

    public static final String SELECT_MAX_ID =
            "SELECT COALESCE(MAX(id), 100) FROM movies";

    public static final String SELECT_MOVIE_BY_ID =
            "SELECT * FROM movies WHERE id = ?";

    public static final String COUNT_MOVIE_BY_ID =
            "SELECT COUNT(*) FROM movies WHERE id = ?";

    public static final String DELETE_MOVIE_BY_ID =
            "DELETE FROM movies WHERE id = ?";

    public static final String BASE_SELECT_ALL =
            "SELECT * FROM movies WHERE 1=1";

    public static final String UPSERT_MOVIE = """
            INSERT INTO movies (
                id, title, genre, rating, year, release_date, duration, price, ai_pick, synopsis,
                suggested_seats_csv, poster_url, auditorium, status, occupancy_rate, showtimes,
                rotten_tomatoes, metacritic, imdb_rating, critic_consensus, top_critic_quote,
                reviews_count, trailer_url, director, cast_members, age_rating
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                genre = EXCLUDED.genre,
                rating = EXCLUDED.rating,
                year = EXCLUDED.year,
                release_date = EXCLUDED.release_date,
                duration = EXCLUDED.duration,
                price = EXCLUDED.price,
                ai_pick = EXCLUDED.ai_pick,
                synopsis = EXCLUDED.synopsis,
                suggested_seats_csv = EXCLUDED.suggested_seats_csv,
                poster_url = EXCLUDED.poster_url,
                auditorium = EXCLUDED.auditorium,
                status = EXCLUDED.status,
                occupancy_rate = EXCLUDED.occupancy_rate,
                showtimes = EXCLUDED.showtimes,
                rotten_tomatoes = EXCLUDED.rotten_tomatoes,
                metacritic = EXCLUDED.metacritic,
                imdb_rating = EXCLUDED.imdb_rating,
                critic_consensus = EXCLUDED.critic_consensus,
                top_critic_quote = EXCLUDED.top_critic_quote,
                reviews_count = EXCLUDED.reviews_count,
                trailer_url = EXCLUDED.trailer_url,
                director = EXCLUDED.director,
                cast_members = EXCLUDED.cast_members,
                age_rating = EXCLUDED.age_rating
            """;
}
