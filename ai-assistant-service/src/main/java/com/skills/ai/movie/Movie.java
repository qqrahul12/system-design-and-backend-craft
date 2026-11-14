package com.skills.ai.movie;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Domain entity representing a movie in CineMind's live theater catalog.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Movie {
    private Long id;
    private String title;
    private String genre;
    private Double rating;
    private Integer year;
    private String duration;
    private Double price;
    private Boolean aiPick;
    private String synopsis;
    private List<String> suggestedSeats;
    private String posterUrl;
    private String auditorium;
    private String status; // "NOW_SHOWING", "UPCOMING", "SPECIAL_ENGAGEMENT"
    private Integer occupancyRate;
    private String showtimes;
}
