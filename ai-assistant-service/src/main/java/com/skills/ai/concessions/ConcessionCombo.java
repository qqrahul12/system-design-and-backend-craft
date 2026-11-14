package com.skills.ai.concessions;

import java.util.List;

/**
 * Curated F&B pairing combo with bundled discount and AI rationale.
 */
public record ConcessionCombo(
        String id,
        String name,
        List<ConcessionItem> items,
        double originalPrice,
        double comboPrice,
        double savings,
        String aiRationale,
        String matchedGenre
) {}
