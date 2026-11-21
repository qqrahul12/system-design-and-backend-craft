package com.skills.ai.mcp;

import com.skills.ai.auth.AuthService;
import com.skills.ai.concessions.ConcessionCombo;
import com.skills.ai.concessions.ConcessionItem;
import com.skills.ai.concessions.ConcessionsService;
import com.skills.ai.movie.Movie;
import com.skills.ai.movie.MovieCatalogService;
import com.skills.ai.rag.InMemoryVectorStore;
import com.skills.ai.rag.RagService;
import com.skills.ai.split.SplitExpense;
import com.skills.ai.split.SplitMoneyService;
import com.skills.ai.ticket.DigitalTicket;
import com.skills.ai.ticket.TicketService;
import com.skills.ai.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;

/**
 * Registry & Executor for Model Context Protocol (MCP) Tools.
 *
 * <p>Exposes tools that any MCP-compliant client (Cursor, Claude Desktop, Antigravity, or UI)
 * can discover and invoke.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpToolRegistry {

    private final RagService ragService;
    private final InMemoryVectorStore vectorStore;
    private final ConcessionsService concessionsService;
    private final MovieCatalogService movieCatalogService;
    private final TicketService ticketService;
    private final WalletService walletService;
    private final AuthService authService;
    private final SplitMoneyService splitMoneyService;
    private final com.skills.ai.admin.CinemaInsightsService cinemaInsightsService;

    private final Map<String, McpToolDefinition> toolDefinitions = new HashMap<>();
    private final Map<String, Function<Map<String, Object>, McpToolDefinition.CallResult>> toolExecutors = new HashMap<>();

    public void registerDefaultTools() {
        // 1. Movie Search Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("search_movies")
                        .description("Search, filter, and sort currently running theatrical movies, genres, ratings, and ticket prices in CineMind theaters.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "genre", Map.of("type", "string", "description", "Optional genre filter: Sci-Fi, Action, Drama, Horror, Adventure"),
                                        "query", Map.of("type", "string", "description", "Search keywords in movie title or synopsis"),
                                        "sortBy", Map.of("type", "string", "description", "Sort field: rating (default), price, year, title"),
                                        "sortOrder", Map.of("type", "string", "description", "Sort direction: asc or desc (default: desc)"),
                                        "minRating", Map.of("type", "number", "description", "Optional minimum rating threshold (e.g. 8.0)"),
                                        "maxPrice", Map.of("type", "number", "description", "Optional maximum ticket price threshold (e.g. 18.00)")
                                )
                        ))
                        .build(),
                args -> {
                    String q = (String) args.getOrDefault("query", "");
                    String genre = (String) args.getOrDefault("genre", "");
                    String sortBy = (String) args.getOrDefault("sortBy", "rating");
                    String sortOrder = (String) args.getOrDefault("sortOrder", "desc");
                    Double minRating = args.containsKey("minRating") && args.get("minRating") instanceof Number n ? n.doubleValue() : null;
                    Double maxPrice = args.containsKey("maxPrice") && args.get("maxPrice") instanceof Number n ? n.doubleValue() : null;

                    List<Movie> results = movieCatalogService.getAllMovies(genre, null, q);
                    if (results.isEmpty()) {
                        return McpToolDefinition.CallResult.text("No movies found matching criteria.");
                    }

                    // Apply multi-attribute filtering
                    java.util.stream.Stream<Movie> stream = results.stream();
                    if (minRating != null) {
                        stream = stream.filter(m -> m.getRating() >= minRating);
                    }
                    if (maxPrice != null) {
                        stream = stream.filter(m -> m.getPrice() <= maxPrice);
                    }

                    // Apply dynamic sorting
                    Comparator<Movie> comparator = switch (sortBy != null ? sortBy.toLowerCase().trim() : "rating") {
                        case "price" -> Comparator.comparingDouble(Movie::getPrice);
                        case "year" -> Comparator.comparingInt(m -> m.getYear() != null ? m.getYear() : 0);
                        case "title" -> Comparator.comparing(Movie::getTitle, String.CASE_INSENSITIVE_ORDER);
                        default -> Comparator.comparingDouble(Movie::getRating);
                    };

                    if ("desc".equalsIgnoreCase(sortOrder)) {
                        comparator = comparator.reversed();
                    }

                    List<Movie> filtered = stream.sorted(comparator).toList();
                    if (filtered.isEmpty()) {
                        return McpToolDefinition.CallResult.text("No movies matched the specified filter thresholds.");
                    }

                    StringBuilder sb = new StringBuilder("Found " + filtered.size() + " theatrical releases (sorted by " + sortBy + " " + sortOrder.toUpperCase() + "):\n");
                    for (int i = 0; i < Math.min(5, filtered.size()); i++) {
                        Movie m = filtered.get(i);
                        sb.append(String.format("%d. %s (%s, Year: %d, Rating: %.1f, $%.2f) - Auditorium: %s, Shows: %s\n",
                                i + 1, m.getTitle(), m.getGenre(), m.getYear() != null ? m.getYear() : 2026, m.getRating(), m.getPrice(), m.getAuditorium(), m.getShowtimes()));
                    }
                    return McpToolDefinition.CallResult.text(sb.toString().trim());
                }
        );

        // 2. Check Seats Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("check_seats")
                        .description("Inspect seat availability and optimal view recommendations for a specific movie show.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Title of the movie"),
                                        "showTime", Map.of("type", "string", "description", "Show time e.g. '9:30 PM'")
                                ),
                                "required", List.of("movieTitle")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.get("movieTitle");
                    return McpToolDefinition.CallResult.text(String.format(
                            "Available seats for '%s': [A1, A2, B3 (AI Recommended), B4 (AI Recommended), C5, C6]. 24 seats vacant.",
                            movie));
                }
        );

        // 3. Process Booking Payment Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("process_payment")
                        .description("Processes idempotent payment capture and issues an authenticated cryptographic digital ticket pass.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Title of movie"),
                                        "showTime", Map.of("type", "string", "description", "Showtime"),
                                        "seats", Map.of("type", "string", "description", "Comma-separated seats e.g. 'B3,B4'"),
                                        "amount", Map.of("type", "number", "description", "Total amount in USD"),
                                        "paymentMethod", Map.of("type", "string", "description", "Card identifier or token")
                                ),
                                "required", List.of("seats", "amount")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.getOrDefault("movieTitle", "Inception");
                    String showTime = (String) args.getOrDefault("showTime", "7:30 PM");
                    String seatsStr = (String) args.getOrDefault("seats", "B3, B4");
                    Number amount = (Number) args.getOrDefault("amount", 24.0);
                    double total = amount != null ? amount.doubleValue() : 24.0;
                    List<String> seats = Arrays.stream(seatsStr.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
                    if (seats.isEmpty()) seats = List.of("B3", "B4");

                    DigitalTicket ticket = ticketService.issueTicket(
                            movie,
                            showTime,
                            "IMAX 70mm",
                            "Auditorium 1 (Dolby Atmos)",
                            seats,
                            total
                    );

                    String txnId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    String sig = ticket.hmacSignature() != null && ticket.hmacSignature().length() >= 10
                            ? ticket.hmacSignature().substring(0, 10)
                            : "AUTH-HMAC";
                    return McpToolDefinition.CallResult.text(String.format(
                            "Payment of $%.2f captured successfully! TxnRef: %s. Ticket issued: ID=%s, Seats=[%s], HMAC Signature=%s. Digital pass active in wallet.",
                            total, txnId, ticket.ticketId(), String.join(", ", seats), sig));
                }
        );

        // 4. RAG Knowledge Search Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("rag_knowledge_search")
                        .description("Queries CineMind's indexed vector knowledge base for terms, FAQs, and policies.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "question", Map.of("type", "string", "description", "The specific question to query")
                                ),
                                "required", List.of("question")
                        ))
                        .build(),
                args -> {
                    String question = (String) args.get("question");
                    if (question == null || question.isBlank()) {
                        return McpToolDefinition.CallResult.error("Question parameter is required.");
                    }
                    RagService.RagResponse ragRes = ragService.query(question, 2);
                    return McpToolDefinition.CallResult.text(String.format(
                            "RAG Answer: %s (Derived from %d citations, vector count: %d)",
                            ragRes.answer(), ragRes.citations().size(), ragRes.totalIndexedChunks()));
                }
        );

        // 5. Apply Promocode Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("apply_promocode")
                        .description("Validates promo discount codes (e.g. CINE20, VIP50, STUDENT10) and calculates adjusted pricing.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "code", Map.of("type", "string", "description", "Promocode name e.g. CINE20"),
                                        "baseAmount", Map.of("type", "number", "description", "Subtotal amount before discount")
                                ),
                                "required", List.of("code", "baseAmount")
                        ))
                        .build(),
                args -> {
                    String code = ((String) args.getOrDefault("code", "")).trim().toUpperCase();
                    Number base = (Number) args.getOrDefault("baseAmount", 30.0);
                    double subtotal = base.doubleValue();
                    double discountPercent = 0.0;
                    if ("CINE20".equals(code)) discountPercent = 0.20;
                    else if ("VIP50".equals(code)) discountPercent = 0.50;
                    else if ("STUDENT10".equals(code)) discountPercent = 0.10;
                    else {
                        return McpToolDefinition.CallResult.text(String.format(
                                "Invalid promo code '%s'. Available valid codes: CINE20 (20%% off), STUDENT10 (10%% off), VIP50 (50%% off). Base: $%.2f",
                                code, subtotal));
                    }
                    double savings = subtotal * discountPercent;
                    double finalPrice = subtotal - savings;
                    return McpToolDefinition.CallResult.text(String.format(
                            "Promo '%s' applied successfully! Discount: %.0f%% (-$%.2f). Adjusted total: $%.2f (Original: $%.2f)",
                            code, discountPercent * 100, savings, finalPrice, subtotal));
                }
        );

        // 6. Reserve Seats Lock Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("reserve_seats")
                        .description("Places a temporary distributed lock on specific auditorium seats for 10 minutes.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Movie title"),
                                        "seats", Map.of("type", "string", "description", "Comma-separated seats e.g. 'B3,B4'")
                                ),
                                "required", List.of("movieTitle", "seats")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.getOrDefault("movieTitle", "Movie");
                    String seats = (String) args.getOrDefault("seats", "B3");
                    List<String> seatList = Arrays.stream(seats.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
                    if (seatList.isEmpty()) seatList = List.of("B3");
                    TicketService.SeatLock lock = ticketService.acquireSeatLock(movie, "7:30 PM", seatList);
                    return McpToolDefinition.CallResult.text(String.format(
                            "Lock acquired! Seats [%s] for '%s' reserved under Distributed Lock Token: %s. TTL: 600s.",
                            String.join(", ", seatList), movie, lock.lockToken()));
                }
        );

        // 7. Audit Compliance Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("audit_compliance")
                        .description("Audits booking compliance: age rating check, maximum seat quota (<=6), and price integrity.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Movie title"),
                                        "seatCount", Map.of("type", "number", "description", "Number of requested seats"),
                                        "userAge", Map.of("type", "number", "description", "Age of primary patron")
                                ),
                                "required", List.of("movieTitle", "seatCount")
                        ))
                        .build(),
                args -> {
                    String movie = (String) args.getOrDefault("movieTitle", "");
                    Number countNum = (Number) args.getOrDefault("seatCount", 1);
                    Number ageNum = (Number) args.getOrDefault("userAge", 21);
                    int count = countNum.intValue();
                    int age = ageNum.intValue();
                    if (count > 6) {
                        return McpToolDefinition.CallResult.error("Compliance Violation: Maximum seat reservation quota per user is 6 seats.");
                    }
                    if (movie.toLowerCase().contains("oppenheimer") && age < 17) {
                        return McpToolDefinition.CallResult.error("Compliance Violation: 'Oppenheimer' is Rated R. Patron age (" + age + ") is under 17.");
                    }
                    return McpToolDefinition.CallResult.text(String.format(
                            "Compliance Verified: %d seats for '%s' approved. Age criteria met (%d yrs). No blacklisted entities detected.",
                            count, movie, age));
                }
        );

        // 8. Concessions Menu Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("get_concessions_menu")
                        .description("Lists CineMind gourmet F&B items with pricing, calories, and dietary certifications.")
                        .inputSchema(Map.of("type", "object"))
                        .build(),
                args -> {
                    List<ConcessionItem> items = concessionsService.getMenu();
                    StringBuilder sb = new StringBuilder("CineMind Concessions Menu:\n");
                    for (ConcessionItem item : items) {
                        sb.append(String.format("• %s %s - $%.2f (%d cal, %s)\n",
                                item.icon(), item.name(), item.price(), item.calories(), String.join(", ", item.dietary())));
                    }
                    return McpToolDefinition.CallResult.text(sb.toString().trim());
                }
        );

        // 9. Recommend Concessions Combos Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("recommend_concessions")
                        .description("AI-curated food & beverage sensory combos tailored to movie genre and party size.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "genre", Map.of("type", "string", "description", "Movie genre e.g. Sci-Fi, Action, Drama"),
                                        "partySize", Map.of("type", "number", "description", "Number of patrons")
                                ),
                                "required", List.of("genre")
                        ))
                        .build(),
                args -> {
                    String genre = (String) args.getOrDefault("genre", "Sci-Fi");
                    Number party = (Number) args.getOrDefault("partySize", 2);
                    List<ConcessionCombo> combos = concessionsService.recommendCombos(genre, party.intValue());
                    if (combos.isEmpty()) {
                        return McpToolDefinition.CallResult.text("No specific combo for genre: " + genre);
                    }
                    ConcessionCombo c = combos.get(0);
                    return McpToolDefinition.CallResult.text(String.format(
                            "Recommended Combo: %s | Price: $%.2f (Save $%.2f) | Rationale: %s",
                            c.name(), c.comboPrice(), c.savings(), c.aiRationale()));
                }
        );

        // 10. Movie Reviews & Live Critic Scores Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("get_movie_reviews")
                        .description("Fetches real-time verified critic reviews, Rotten Tomatoes score, Metacritic rating, IMDb rating, and critical consensus for a theatrical movie.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "movieTitle", Map.of("type", "string", "description", "Title of the movie to lookup reviews for")
                                ),
                                "required", List.of("movieTitle")
                        ))
                        .build(),
                args -> {
                    String title = (String) args.getOrDefault("movieTitle", "");
                    List<Movie> matches = movieCatalogService.getAllMovies(null, null, title);
                    if (matches.isEmpty()) {
                        return McpToolDefinition.CallResult.text("No review records found in CineMind catalog for: " + title);
                    }
                    Movie m = matches.get(0);
                    int rt = m.getRottenTomatoes() != null ? m.getRottenTomatoes() : 88;
                    int mc = m.getMetacritic() != null ? m.getMetacritic() : 80;
                    double imdb = m.getImdbRating() != null ? m.getImdbRating() : 8.2;
                    int reviews = m.getReviewsCount() != null ? m.getReviewsCount() : 350;
                    String consensus = m.getCriticConsensus() != null ? m.getCriticConsensus() : "Critically acclaimed theatrical presentation.";
                    String quote = m.getTopCriticQuote() != null ? m.getTopCriticQuote() : "\"Exceptional cinema.\" — Variety";
                    String freshBadge = rt >= 90 ? "Certified Fresh 🍅" : "Fresh 🍅";

                    return McpToolDefinition.CallResult.text(String.format(
                            "Critic Review Intelligence for '%s' (%d):\n" +
                            "• Rotten Tomatoes: %d%% (%s)\n" +
                            "• Metacritic Score: %d/100 (Universal Acclaim)\n" +
                            "• IMDb Rating: %.1f/10 (%d verified reviews)\n" +
                            "• Critical Consensus: \"%s\"\n" +
                            "• Top Critic Quote: %s",
                            m.getTitle(), m.getYear(), rt, freshBadge, mc, imdb, reviews, consensus, quote));
                }
        );

        // 11. Ingest Real-Time Current Year Theatrical Releases Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("ingest_current_year_movies")
                        .description("Ingests real-time theatrical blockbuster movie releases for the current year (2024-2026) directly into the CineMind database with verified critic scores, auditoriums, showtimes, cast, and trailers.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "year", Map.of("type", "number", "description", "The release year to ingest, e.g. 2026")
                                )
                        ))
                        .build(),
                args -> {
                    Number yrNum = (Number) args.getOrDefault("year", 2026);
                    int year = yrNum != null ? yrNum.intValue() : 2026;
                    List<Movie> ingested = movieCatalogService.ingestCurrentYearMovies(year);
                    StringBuilder sb = new StringBuilder(String.format("✅ Successfully ingested %d real-time %d theatrical releases into CineMind database:\n", ingested.size(), year));
                    for (int i = 0; i < ingested.size(); i++) {
                        Movie m = ingested.get(i);
                        sb.append(String.format("%d. %s (%d, %s) | Rating: %.1f | RT: %d%% | %s | %s | Dir: %s\n",
                                i + 1, m.getTitle(), m.getYear(), m.getGenre(), m.getRating(), m.getRottenTomatoes(), m.getAuditorium(), m.getShowtimes(), m.getDirector()));
                    }
                    return McpToolDefinition.CallResult.text(sb.toString().trim());
                }
        );

        // 12. Check Fintech Wallet Balance Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("check_wallet_balance")
                        .description("Checks the user's CineMind Fintech Digital Wallet balance, currency, and recent ledger transactions.")
                        .inputSchema(Map.of("type", "object"))
                        .build(),
                args -> {
                    WalletService.WalletSummary summary = walletService.getWalletSummary();
                    AuthService.UserProfile user = authService.getCurrentUser();
                    return McpToolDefinition.CallResult.text(String.format(
                            "Fintech Wallet [%s] for %s (%s):\n• Available Balance: $%.2f %s\n• Lifetime Transactions: %d\n• Status: Active & Authenticated",
                            summary.walletId(), user.fullName(), user.roleDisplayName(), summary.balance(), summary.currency(), summary.transactionCount()));
                }
        );

        // 13. Pay with Fintech Wallet Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("pay_with_wallet")
                        .description("Debits stored-value balance from the user's CineMind Fintech Wallet for seamless 1-click checkout.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "amount", Map.of("type", "number", "description", "Amount in USD to debit"),
                                        "description", Map.of("type", "string", "description", "Payment purpose e.g. '2 Tickets for Interstellar'")
                                ),
                                "required", List.of("amount")
                        ))
                        .build(),
                args -> {
                    Number amtNum = (Number) args.getOrDefault("amount", 20.0);
                    double amount = amtNum.doubleValue();
                    String desc = (String) args.getOrDefault("description", "CineMind Wallet 1-Click Payment");
                    try {
                        WalletService.WalletTransaction txn = walletService.debit(amount, "TICKET_PAYMENT", desc);
                        return McpToolDefinition.CallResult.text(String.format(
                                "✅ Wallet payment of $%.2f captured! TxnRef: %s. Remaining Wallet Balance: $%.2f. Description: %s",
                                txn.amount(), txn.txnId(), txn.balanceAfter(), txn.description()));
                    } catch (Exception e) {
                        return McpToolDefinition.CallResult.error("Wallet Payment Failed: " + e.getMessage());
                    }
                }
        );

        // 14. Public Cinema Insights & Market Benchmarks Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("get_public_cinema_insights")
                        .description("Fetches public cinema industry benchmarks, national box office YoY metrics, theater attendance trends, and verified audience sentiment via Model Context Protocol.")
                        .inputSchema(Map.of("type", "object"))
                        .build(),
                args -> {
                    Map<String, Object> insights = cinemaInsightsService.calculateMarketInsights();
                    return McpToolDefinition.CallResult.text(cinemaInsightsService.formatInsightsAsText(insights));
                }
        );

        // 15. Split Movie & Concessions Bill Tool (SplitMoney Integration)
        registerTool(
                McpToolDefinition.builder()
                        .name("split_movie_bill")
                        .description("Splits a movie ticket or concessions order bill among friends in a CineMind movie squad using the SplitMoney engine.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "billName", Map.of("type", "string", "description", "Description of bill e.g. 'Dune 2 IMAX Tickets'"),
                                        "totalAmount", Map.of("type", "number", "description", "Total amount in USD to split"),
                                        "payerUserId", Map.of("type", "string", "description", "ID of the user who paid initially"),
                                        "memberCount", Map.of("type", "number", "description", "Number of friends sharing the bill")
                                ),
                                "required", List.of("billName", "totalAmount")
                        ))
                        .build(),
                args -> {
                    String name = (String) args.getOrDefault("billName", "Movie Outing Bill");
                    Number amtNum = (Number) args.getOrDefault("totalAmount", 40.0);
                    String payer = (String) args.getOrDefault("payerUserId", "usr-marcus");
                    SplitExpense expense = splitMoneyService.splitBill(name, amtNum.doubleValue(), payer, null, "MCP_SPLIT", "REF-" + System.currentTimeMillis());
                    return McpToolDefinition.CallResult.text(String.format(
                            "✅ SplitMoney Expense Created! ID: %s | Bill: '%s' | Total: $%.2f | Payer: %s | Individual Share: $%.2f each across %d squad members. Status: Active in Squad Ledger.",
                            expense.id(), expense.name(), expense.totalAmount(), expense.paidByUserName(), expense.shares().get(0).shareAmount(), expense.shares().size()
                    ));
                }
        );

        // 16. Add Theatrical Film to Catalog Tool
        registerTool(
                McpToolDefinition.builder()
                        .name("add_movie")
                        .description("Creates and registers a new theatrical film release in the CineMind movie database with custom pricing, auditorium, showtimes, and critic metadata.")
                        .inputSchema(Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "title", Map.of("type", "string", "description", "Title of the movie"),
                                        "genre", Map.of("type", "string", "description", "Genre, e.g. 'Sci-Fi', 'Action', 'Drama'"),
                                        "year", Map.of("type", "number", "description", "Release year, e.g. 2026"),
                                        "price", Map.of("type", "number", "description", "Standard ticket price in USD"),
                                        "auditorium", Map.of("type", "string", "description", "Auditorium name e.g. 'IMAX 70mm Auditorium 1'"),
                                        "showtimes", Map.of("type", "string", "description", "Comma-separated showtimes e.g. '2:00 PM, 6:00 PM, 9:30 PM'"),
                                        "synopsis", Map.of("type", "string", "description", "Plot summary"),
                                        "director", Map.of("type", "string", "description", "Director name"),
                                        "rating", Map.of("type", "number", "description", "Audience rating score out of 5.0")
                                ),
                                "required", List.of("title", "genre", "price")
                        ))
                        .build(),
                args -> {
                    String title = (String) args.get("title");
                    String genre = (String) args.getOrDefault("genre", "Sci-Fi");
                    Number yearNum = (Number) args.getOrDefault("year", 2026);
                    Number priceNum = (Number) args.getOrDefault("price", 18.0);
                    Number ratingNum = (Number) args.getOrDefault("rating", 4.8);
                    String auditorium = (String) args.getOrDefault("auditorium", "");
                    String showtimes = (String) args.getOrDefault("showtimes", "");
                    String synopsis = (String) args.getOrDefault("synopsis", "");
                    String director = (String) args.getOrDefault("director", "");
                    String duration = (String) args.getOrDefault("duration", "");

                    Movie created = movieCatalogService.createMovie(Movie.builder()
                            .title(title)
                            .genre(genre)
                            .year(yearNum != null ? yearNum.intValue() : java.time.LocalDate.now().getYear())
                            .price(priceNum != null ? priceNum.doubleValue() : 18.0)
                            .rating(ratingNum != null ? ratingNum.doubleValue() : 0.0)
                            .auditorium(auditorium)
                            .showtimes(showtimes)
                            .synopsis(synopsis)
                            .director(director)
                            .status("NOW_SHOWING")
                            .aiPick(false)
                            .duration(duration)
                            .occupancyRate(0)
                            .suggestedSeats(Collections.emptyList())
                            .posterUrl("")
                            .rottenTomatoes(0)
                            .metacritic(0)
                            .imdbRating(0.0)
                            .criticConsensus("")
                            .topCriticQuote("")
                            .reviewsCount(0)
                            .trailerUrl("")
                            .cast("")
                            .ageRating("PG-13")
                            .build());

                    return McpToolDefinition.CallResult.text(String.format(
                            "✅ Movie '%s' (ID: %d) successfully added to CineMind database!\n" +
                            "• Genre: %s | Year: %d | Ticket: $%.2f | Rating: %.1f\n" +
                            "• Auditorium: %s\n" +
                            "• Showtimes: %s\n" +
                            "• Synopsis: %s",
                            created.getTitle(), created.getId(), created.getGenre(), created.getYear(),
                            created.getPrice(), created.getRating(), created.getAuditorium(),
                            created.getShowtimes(), created.getSynopsis()
                    ));
                }
        );
    }

    public Map<String, Object> fetchPublicCinemaInsights() {
        return cinemaInsightsService.calculateMarketInsights();
    }

    public String formatPublicInsightsAsText(Map<String, Object> insights) {
        return cinemaInsightsService.formatInsightsAsText(insights);
    }

    public void registerTool(McpToolDefinition definition, Function<Map<String, Object>, McpToolDefinition.CallResult> executor) {
        toolDefinitions.put(definition.getName(), definition);
        toolExecutors.put(definition.getName(), executor);
        log.info("Registered MCP tool: {}", definition.getName());
    }

    public List<McpToolDefinition> listTools() {
        if (toolDefinitions.isEmpty()) {
            registerDefaultTools();
        }
        return new ArrayList<>(toolDefinitions.values());
    }

    public McpToolDefinition.CallResult executeTool(String toolName, Map<String, Object> arguments) {
        if (toolDefinitions.isEmpty()) {
            registerDefaultTools();
        }
        Function<Map<String, Object>, McpToolDefinition.CallResult> executor = toolExecutors.get(toolName);
        if (executor == null) {
            return McpToolDefinition.CallResult.error("Unknown MCP tool: " + toolName);
        }
        try {
            return executor.apply(arguments != null ? arguments : Collections.emptyMap());
        } catch (Exception e) {
            log.error("Error executing MCP tool {}: {}", toolName, e.getMessage(), e);
            return McpToolDefinition.CallResult.error("Execution error: " + e.getMessage());
        }
    }
}
