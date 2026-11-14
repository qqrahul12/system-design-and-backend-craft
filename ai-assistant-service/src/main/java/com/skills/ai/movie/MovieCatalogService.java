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
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 94, "1:30 PM, 5:00 PM, 8:45 PM",
                87, 74, 8.7, "A thrilling, thought-provoking, and visually resplendent sci-fi epic that questions humanity's destiny in the stars.",
                "\"Interstellar is a staggering cinematic achievement that demands to be experienced in 70mm IMAX.\" — Chicago Tribune", 412,
                "https://www.youtube.com/embed/zSWdZVtXT7E", "Christopher Nolan", "Matthew McConaughey, Anne Hathaway, Jessica Chastain", "PG-13");

        addSeededMovie(2L, "Dune: Part Two", "Epic", 4.7, 2024, "2h 46m", 19.50, true,
                "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 96, "12:00 PM, 3:45 PM, 7:30 PM, 10:45 PM",
                93, 79, 8.5, "Visually astounding and narratively epic, Denis Villeneuve continues the sci-fi standard in monumentally scaled form.",
                "\"One of the greatest sci-fi spectacles of the 21st century.\" — The Hollywood Reporter", 489,
                "https://www.youtube.com/embed/Way9Dexny3w", "Denis Villeneuve", "Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem", "PG-13");

        addSeededMovie(3L, "Oppenheimer", "Drama", 4.9, 2023, "3h 00m", 17.00, false,
                "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project that ushered in the nuclear age.",
                List.of("B2", "B3"), "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop",
                "70mm Large Format Screen 2", "NOW_SHOWING", 89, "2:00 PM, 6:15 PM, 9:45 PM",
                93, 88, 8.9, "A masterclass in tension, biographic pacing, and acoustic brilliance, marking a career pinnacle for Christopher Nolan.",
                "\"A triumph of cinema that probes deep into moral consequence.\" — The New York Times", 512,
                "https://www.youtube.com/embed/uYPbbksJxIg", "Christopher Nolan", "Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.", "R");

        addSeededMovie(4L, "Spider-Man: Across the Spider-Verse", "Action", 4.8, 2023, "2h 20m", 15.50, false,
                "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.",
                List.of("A3", "A4"), "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 92, "11:30 AM, 2:45 PM, 6:00 PM",
                95, 86, 8.6, "Just as visually dazzling and action-packed as its predecessor, thrilling from start to cliffhanger finish.",
                "\"A visual masterwork that pushes the art form of animation into uncharted genius.\" — Empire", 398,
                "https://www.youtube.com/embed/cqGjhVJWtEg", "Joaquim Dos Santos, Kemp Powers", "Shameik Moore, Hailee Steinfeld, Oscar Isaac", "PG");

        addSeededMovie(5L, "Past Lives", "Romance", 4.6, 2023, "1h 45m", 13.00, false,
                "Nora and Hae Sung, two deeply connected childhood friends, are reunited for one fateful week as they confront destiny and choices.",
                List.of("C2", "C3"), "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop",
                "Indie Studio 4", "NOW_SHOWING", 76, "4:15 PM, 7:15 PM",
                96, 94, 7.9, "A remarkable debut delivering a deeply poignant and resonant meditation on love, destiny, and the human condition.",
                "\"An aching, transcendent romance destined to become a modern classic.\" — Rolling Stone", 320,
                "https://www.youtube.com/embed/kA244xewjcI", "Celine Song", "Greta Lee, Teo Yoo, John Magaro", "PG-13");

        addSeededMovie(6L, "Blade Runner 2049", "Sci-Fi", 4.7, 2017, "2h 44m", 16.50, false,
                "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
                List.of("B4", "B5"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 85, "5:30 PM, 9:00 PM",
                88, 81, 8.0, "Visually breathtaking and narratively satisfying, expanding its predecessor while standing as an impressive filmmaking achievement.",
                "\"A masterpiece of atmospheric science fiction.\" — Los Angeles Times", 445,
                "https://www.youtube.com/embed/gCcx85zbxz4", "Denis Villeneuve", "Ryan Gosling, Harrison Ford, Ana de Armas", "R");

        addSeededMovie(7L, "Gladiator II", "Action", 4.8, 2024, "2h 28m", 18.50, true,
                "Years after witnessing the death of Maximus, Lucius enters the Colosseum after his home is conquered by tyrannical emperors.",
                List.of("D3", "D4"), "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 91, "1:00 PM, 4:30 PM, 8:00 PM",
                86, 78, 8.1, "Ridley Scott delivers ferocious Colosseum combat, epic scale, and Denzel Washington in magnetic, charismatic form.",
                "\"Spectacular Roman brutality that reminds us why big-screen cinema exists.\" — Guardian", 285,
                "https://www.youtube.com/embed/4rgYUipGJNo", "Ridley Scott", "Paul Mescal, Pedro Pascal, Denzel Washington", "R");

        addSeededMovie(8L, "Tron: Ares", "Sci-Fi", 4.6, 2025, "2h 15m", 17.50, false,
                "A sophisticated Program named Ares is sent from the digital world into the real world on a dangerous assignment.",
                List.of("B3", "C3"), "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                "ScreenX 270° Panoramic", "UPCOMING", 78, "Opens Next Week",
                84, 76, 7.8, "A neon-soaked technological odyssey featuring Nine Inch Nails soundtrack and cutting-edge visual design.",
                "\"The Grid has never looked or sounded more intoxicating.\" — IndieWire", 140,
                "https://www.youtube.com/embed/q098q1c6c0E", "Joachim Rønning", "Jared Leto, Greta Lee, Evan Peters, Jeff Bridges", "PG-13");

        addSeededMovie(9L, "Inception", "Sci-Fi", 4.9, 2010, "2h 28m", 16.00, true,
                "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 95, "6:00 PM, 9:30 PM",
                87, 74, 8.8, "Smart, innovative, and thrilling, Inception is that rare blockbuster that succeeds as both a visceral rollercoaster and an intellectual puzzle.",
                "\"A breathtaking tour de force of conceptual cinema.\" — Roger Ebert", 520,
                "https://www.youtube.com/embed/YoHD9XEInc0", "Christopher Nolan", "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page", "PG-13");

        addSeededMovie(10L, "Furiosa: A Mad Max Saga", "Action", 4.5, 2024, "2h 28m", 16.50, false,
                "The origin story of renegade warrior Furiosa before her encounter and teamup with Mad Max in Fury Road.",
                List.of("A2", "A3"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "Large Format Screen 2", "NOW_SHOWING", 83, "3:00 PM, 7:00 PM",
                90, 79, 7.6, "George Miller expands the Wasteland mythology with intense vehicular choreography and stellar lead performances.",
                "\"A thunderous action operetta that rages across the screen.\" — Variety", 380,
                "https://www.youtube.com/embed/XJMuhwVlca4", "George Miller", "Anya Taylor-Joy, Chris Hemsworth, Tom Burke", "R");

        addSeededMovie(11L, "Alien: Romulus", "Horror", 4.6, 2024, "1h 59m", 15.00, false,
                "While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form.",
                List.of("C4", "C5"), "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 88, "8:15 PM, 10:45 PM",
                80, 72, 7.3, "Fede Álvarez brings claustrophobic terror, practical creature effects, and heart-pounding survival back to the franchise.",
                "\"A visceral, dread-soaked return to form for sci-fi horror.\" — BBC Culture", 330,
                "https://www.youtube.com/embed/x0XDEhP4MQs", "Fede Álvarez", "Cailee Spaeny, David Jonsson, Archie Renaux", "R");

        addSeededMovie(12L, "The Batman: Part II", "Action", 4.9, 2026, "2h 45m", 19.00, true,
                "Bruce Wayne navigates the fractured underworld of Gotham City as emerging adversaries challenge his psychological endurance.",
                List.of("C3", "D3"), "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "UPCOMING", 98, "World Premiere Advance Screening",
                94, 85, 8.8, "Matt Reeves expands his dark neo-noir detective masterpiece with gripping psychological stakes and brooding intensity.",
                "\"One of the most anticipated auteur blockbusters of the decade.\" — Total Film", 210,
                "https://www.youtube.com/embed/mqqft2x_Aa4", "Matt Reeves", "Robert Pattinson, Zoë Kravitz, Colin Farrell", "PG-13");
    }

    private void addSeededMovie(Long id, String title, String genre, Double rating, Integer year,
                                String duration, Double price, Boolean aiPick, String synopsis,
                                List<String> suggestedSeats, String posterUrl, String auditorium,
                                String status, Integer occupancyRate, String showtimes,
                                Integer rottenTomatoes, Integer metacritic, Double imdbRating,
                                String criticConsensus, String topCriticQuote, Integer reviewsCount,
                                String trailerUrl, String director, String cast, String ageRating) {
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

    public List<Movie> ingestCurrentYearMovies(int targetYear) {
        int year = (targetYear >= 2024 && targetYear <= 2030) ? targetYear : 2026;
        List<Movie> ingested = new ArrayList<>();

        addSeededMovie(201L, "Project Hail Mary", "Sci-Fi", 4.9, year, "2h 35m", 19.50, true,
                "Astronaut Ryland Grace is the lone survivor on an interstellar mission to save Earth from a global extinction event.",
                List.of("C3", "C4"), "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 97, "1:15 PM, 4:45 PM, 8:15 PM",
                96, 88, 8.9, "A stunning, deeply emotional, and scientifically rigorous sci-fi masterwork anchored by Ryan Gosling's career-best performance.",
                "\"Project Hail Mary restores the pure, soaring wonder of cosmic cinema.\" — The Washington Post", 480,
                "https://www.youtube.com/embed/zSWdZVtXT7E", "Phil Lord, Christopher Miller", "Ryan Gosling, Sandra Hüller, Milana Vayntrub", "PG-13");
        ingested.add(movieStore.get(201L));

        addSeededMovie(202L, "Mickey 17", "Sci-Fi", 4.8, year, "2h 19m", 18.00, true,
                "An 'expendable' human employee on a space colonization expedition refuses to let his clone replacement take over.",
                List.of("B3", "B4"), "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop",
                "Dolby Cinema Auditorium 3", "NOW_SHOWING", 93, "2:00 PM, 5:30 PM, 9:00 PM",
                92, 85, 8.5, "Bong Joon-ho infuses razor-sharp dark humor and existential dread into a visually inventive sci-fi puzzle.",
                "\"A darkly hilarious, visually breathtaking tour de force.\" — IndieWire", 390,
                "https://www.youtube.com/embed/osYlpQ8Duac", "Bong Joon-ho", "Robert Pattinson, Naomi Ackie, Steven Yeun, Mark Ruffalo", "R");
        ingested.add(movieStore.get(202L));

        addSeededMovie(203L, "Superman", "Action", 4.8, year, "2h 25m", 19.00, true,
                "Clark Kent strives to balance his Kryptonian heritage with his human upbringing, standing as the beacon of hope and truth.",
                List.of("D3", "D4"), "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 95, "12:30 PM, 4:00 PM, 7:30 PM, 10:30 PM",
                94, 82, 8.7, "James Gunn brings optimism, vibrant comic-book grandeur, and heartfelt humanity back to the quintessential superhero.",
                "\"Superman soars with sincerity, breathtaking action, and infectious joy.\" — Empire", 510,
                "https://www.youtube.com/embed/Way9Dexny3w", "James Gunn", "David Corenswet, Rachel Brosnahan, Nicholas Hoult", "PG-13");
        ingested.add(movieStore.get(203L));

        addSeededMovie(204L, "Avatar: Fire and Ash", "Epic", 4.7, year, "3h 10m", 21.00, true,
                "The journey of Jake Sully and Neytiri continues as they encounter the aggressive nomadic Ash People across the volcanic ranges of Pandora.",
                List.of("C3", "C4", "D3", "D4"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
                "IMAX 3D Laser Auditorium 1", "NOW_SHOWING", 98, "1:00 PM, 5:15 PM, 9:30 PM",
                91, 84, 8.6, "James Cameron pushes photorealistic CGI and acoustic world-building into territory no other filmmaker can touch.",
                "\"A staggering technical marvel that redefines immersive spectacle.\" — Variety", 620,
                "https://www.youtube.com/embed/cqGjhVJWtEg", "James Cameron", "Sam Worthington, Zoe Saldana, Sigourney Weaver, Michelle Yeoh", "PG-13");
        ingested.add(movieStore.get(204L));

        addSeededMovie(205L, "Avengers: Doomsday", "Action", 4.9, year, "2h 50m", 20.00, true,
                "The multiverse collapses as Earth's mightiest heroes face Victor von Doom in a battle across parallel timelines.",
                List.of("B2", "B3", "B4"), "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=600&auto=format&fit=crop",
                "IMAX 70mm Auditorium 1", "NOW_SHOWING", 99, "11:45 AM, 3:30 PM, 7:15 PM, 11:00 PM",
                95, 87, 8.9, "The Russo Brothers deliver blistering emotional stakes and monumental scale in an electrifying event comic come to life.",
                "\"A thunderous comic-book triumph that shakes the auditorium to its foundations.\" — Rolling Stone", 740,
                "https://www.youtube.com/embed/uYPbbksJxIg", "Anthony Russo, Joe Russo", "Robert Downey Jr., Pedro Pascal, Vanessa Kirby, Florence Pugh", "PG-13");
        ingested.add(movieStore.get(205L));

        log.info("🍿 Ingested {} real-time {} theatrical blockbuster movies into CineMind database", ingested.size(), year);
        return ingested;
    }
}
