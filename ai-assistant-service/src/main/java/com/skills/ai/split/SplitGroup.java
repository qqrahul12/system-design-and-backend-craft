package com.skills.ai.split;

import java.time.Instant;
import java.util.List;

/**
 * Group entity representing a movie squad or social circle for splitting expenses.
 */
public record SplitGroup(
        String id,
        String name,
        String description,
        List<SplitUser> members,
        Instant createdAt
) {}
