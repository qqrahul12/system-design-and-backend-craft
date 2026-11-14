package com.skills.ai.concessions;

import java.util.List;

/**
 * Model representing a gourmet cinema concession menu item.
 */
public record ConcessionItem(
        String id,
        String name,
        String category, // POPCORN, BEVERAGES, SNACKS, GOURMET
        double price,
        int calories,
        String icon,
        List<String> dietary, // Vegan, Gluten-Free, Halal, Dairy-Free
        List<String> genrePairings, // Sci-Fi, Action, Drama, Horror
        String description
) {}
