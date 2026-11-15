package com.skills.ai.concessions;

import java.util.List;

/**
 * Model representing a gourmet cinema concession menu item.
 */
public record ConcessionItem(
        String id,
        String name,
        String category, // POPCORN, BEVERAGES, SNACKS, GOURMET, HOT_FOOD
        double price,
        int calories,
        String icon,
        List<String> dietary, // Vegan, Gluten-Free, Halal, Dairy-Free, Vegetarian
        List<String> genrePairings, // Sci-Fi, Action, Drama, Horror
        String description,
        Boolean inStock
) {
    public ConcessionItem(
            String id,
            String name,
            String category,
            double price,
            int calories,
            String icon,
            List<String> dietary,
            List<String> genrePairings,
            String description
    ) {
        this(id, name, category, price, calories, icon, dietary, genrePairings, description, true);
    }

    public boolean isInStock() {
        return inStock == null || inStock;
    }
}
