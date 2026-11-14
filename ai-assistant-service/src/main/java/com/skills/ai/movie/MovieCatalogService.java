package com.skills.ai.movie;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * In-memory thread-safe service managing CineMind's live movie catalog.
 */
@Slf4j
@Service
public class MovieCatalogService {

    private final Map<Long, Movie> movieStore = new ConcurrentHashMap<>();
    private final AtomicLong idSequence = new AtomicLong(100);
    private final ChatClient geminiChatClient;
    private final ChatClient groqChatClient;

    public MovieCatalogService(
            @Autowired(required = false) @Qualifier("geminiChatClient") ChatClient geminiChatClient,
            @Autowired(required = false) @Qualifier("groqChatClient") ChatClient groqChatClient
    ) {
        this.geminiChatClient = geminiChatClient;
        this.groqChatClient = groqChatClient;
        seedInitialCatalog();
    }

    private void seedInitialCatalog() {
        addSeededMovie(1L, "Interstellar", "Sci-Fi", 4.8, 2014, "2h 49m", 18.00, true,
                "A team of explorers travel through a wormhole in space to ensure humanity's survival across uncharted galaxies.",
                List.of("B3", "B4"), "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 94, "1:30 PM, 5:00 PM, 8:45 PM");

        addSeededMovie(2L, "Dune: Part Two", "Epic", 4.7, 2024, "2h 46m", 19.50, true,
                "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 96, "12:00 PM, 3:45 PM, 7:30 PM, 10:45 PM");

        addSeededMovie(3L, "Oppenheimer", "Drama", 4.9, 2023, "3h 00m", 17.00, false,
                "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project that ushered in the nuclear age.",
                List.of("B2", "B3"), "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop",
                "70mm Large Format Screen 2", "NOW_SHOWING", 89, "2:00 PM, 6:15 PM, 9:45 PM");

        addSeededMovie(4L, "Spider-Man: Across the Spider-Verse", "Action", 4.8, 2023, "2h 20m", 15.50, false,
                "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.",
                List.of("A3", "A4"), "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 92, "11:30 AM, 2:45 PM, 6:00 PM");

        addSeededMovie(5L, "Past Lives", "Romance", 4.6, 2023, "1h 45m", 13.00, false,
                "Nora and Hae Sung, two deeply connected childhood friends, are reunited for one fateful week as they confront destiny and choices.",
                List.of("C2", "C3"), "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop",
                "Indie Studio 4", "NOW_SHOWING", 76, "4:15 PM, 7:15 PM");

        addSeededMovie(6L, "Blade Runner 2049", "Sci-Fi", 4.7, 2017, "2h 44m", 16.50, false,
                "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
                List.of("B4", "B5"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 85, "5:30 PM, 9:00 PM");

        addSeededMovie(7L, "Gladiator II", "Action", 4.8, 2024, "2h 28m", 18.50, true,
                "Years after witnessing the death of Maximus, Lucius enters the Colosseum after his home is conquered by tyrannical emperors.",
                List.of("D3", "D4"), "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 91, "1:00 PM, 4:30 PM, 8:00 PM");

        addSeededMovie(8L, "Tron: Ares", "Sci-Fi", 4.6, 2025, "2h 15m", 17.50, false,
                "A sophisticated Program named Ares is sent from the digital world into the real world on a dangerous assignment.",
                List.of("B3", "C3"), "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                "ScreenX 270° Panoramic", "UPCOMING", 78, "Opens Next Week");

        addSeededMovie(9L, "Inception", "Sci-Fi", 4.9, 2010, "2h 28m", 16.00, true,
                "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 95, "6:00 PM, 9:30 PM");

        addSeededMovie(10L, "Furiosa: A Mad Max Saga", "Action", 4.5, 2024, "2h 28m", 16.50, false,
                "The origin story of renegade warrior Furiosa before her encounter and teamup with Mad Max in Fury Road.",
                List.of("A2", "A3"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "Large Format Screen 2", "NOW_SHOWING", 83, "3:00 PM, 7:00 PM");

        addSeededMovie(11L, "Alien: Romulus", "Horror", 4.6, 2024, "1h 59m", 15.00, false,
                "While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form.",
                List.of("C4", "C5"), "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 88, "8:15 PM, 10:45 PM");

        addSeededMovie(12L, "The Batman: Part II", "Action", 4.9, 2026, "2h 45m", 19.00, true,
                "Bruce Wayne navigates the fractured underworld of Gotham City as emerging adversaries challenge his psychological endurance.",
                List.of("C3", "D3"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "UPCOMING", 98, "World Premiere Advance Screening");
    }

    private void addSeededMovie(Long id, String title, String genre, Double rating, Integer year,
                                String duration, Double price, Boolean aiPick, String synopsis,
                                List<String> suggestedSeats, String posterUrl, String auditorium,
                                String status, Integer occupancyRate, String showtimes) {
        Movie movie = Movie.builder()
                .id(id)
                .title(title)
                .genre(genre)
                .rating(rating)
                .year(year)
                .duration(duration)
                .price(price)
                .aiPick(aiPick)
                .synopsis(synopsis)
                .suggestedSeats(suggestedSeats)
                .posterUrl(posterUrl)
                .auditorium(auditorium)
                .status(status)
                .occupancyRate(occupancyRate)
                .showtimes(showtimes)
                .build();
        movieStore.put(id, movie);
    }

    public List<Movie> getAllMovies(String genre, String status, String search) {
        return movieStore.values().stream()
                .filter(m -> genre == null || genre.isBlank() || m.getGenre().equalsIgnoreCase(genre))
                .filter(m -> status == null || status.isBlank() || m.getStatus().equalsIgnoreCase(status))
                .filter(m -> search == null || search.isBlank() || m.getTitle().toLowerCase().contains(search.toLowerCase()))
                .sorted(Comparator.comparing(Movie::getId))
                .collect(Collectors.toList());
    }

    public Optional<Movie> getMovieById(Long id) {
        return Optional.ofNullable(movieStore.get(id));
    }

    public Movie createMovie(Movie movie) {
        if (movie.getId() == null) {
            movie.setId(idSequence.incrementAndGet());
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
        movieStore.put(movie.getId(), movie);
        log.info("🎬 Created movie: id={}, title='{}'", movie.getId(), movie.getTitle());
        return movie;
    }

    public Optional<Movie> updateMovie(Long id, Movie updated) {
        if (!movieStore.containsKey(id)) {
            return Optional.empty();
        }
        updated.setId(id);
        movieStore.put(id, updated);
        log.info("✏️ Updated movie: id={}, title='{}'", id, updated.getTitle());
        return Optional.of(updated);
    }

    public boolean deleteMovie(Long id) {
        Movie removed = movieStore.remove(id);
        if (removed != null) {
            log.info("🗑️ Deleted movie: id={}, title='{}'", id, removed.getTitle());
            return true;
        }
        return false;
    }

    /**
     * AI-powered auto-drafting assistant for cinema managers adding new releases.
     * Takes a movie title and generates a cinematic synopsis, recommended duration, price, and genre.
     */
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
        String duration = "2h 20m";
        Double price = 16.00;
        String synopsis = String.format("A visually breathtaking cinematic journey centered on '%s' pushing the boundaries of theatrical storytelling.", title);

        try {
            java.util.concurrent.CompletableFuture<String> future = java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                try {
                    ChatClient client = groqChatClient != null ? groqChatClient : geminiChatClient;
                    if (client != null) {
                        return client.prompt(prompt).call().content();
                    }
                } catch (Exception e) {
                    log.warn("AI draft LLM error: {}", e.getMessage());
                }
                return null;
            });

            String aiResponse = future.get(3500, java.util.concurrent.TimeUnit.MILLISECONDS);
            if (aiResponse != null && !aiResponse.isBlank()) {
                for (String line : aiResponse.split("\n")) {
                    String trimmed = line.trim();
                    if (trimmed.startsWith("GENRE:")) genre = trimmed.substring(6).trim();
                    else if (trimmed.startsWith("DURATION:")) duration = trimmed.substring(9).trim();
                    else if (trimmed.startsWith("PRICE:")) {
                        try { price = Double.parseDouble(trimmed.substring(6).replaceAll("[^0-9.]", "")); } catch (Exception ignored) {}
                    }
                    else if (trimmed.startsWith("SYNOPSIS:")) synopsis = trimmed.substring(9).trim();
                }
            }
        } catch (Exception e) {
            log.info("AI draft generation fast fallback triggered for title='{}': {}", title, e.getMessage());
        }

        return Movie.builder()
                .title(title)
                .genre(genre)
                .duration(duration)
                .price(price)
                .rating(4.8)
                .year(2025)
                .aiPick(true)
                .synopsis(synopsis)
                .suggestedSeats(List.of("C3", "C4"))
                .auditorium("IMAX 70mm Auditorium 1")
                .status("NOW_SHOWING")
                .occupancyRate(85)
                .showtimes("1:00 PM, 4:30 PM, 8:00 PM")
                .posterUrl("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop")
                .build();
    }
}
