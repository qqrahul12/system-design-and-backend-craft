package com.booking.service;

import com.booking.config.CacheConfig;
import com.booking.entity.MovieEntity;
import com.booking.repository.MovieRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes = {MovieCatalogService.class, CacheConfig.class})
public class MovieCatalogServiceTest {

    @Autowired
    private MovieCatalogService movieCatalogService;

    @Autowired
    private CacheManager cacheManager;

    @MockBean
    private MovieRepository movieRepository;

    @Test
    @DisplayName("Test @Cacheable caches movie lookup and eliminates DB calls on hit")
    void testCacheableBehavior() {
        String movieId = "M101";
        MovieEntity movie = MovieEntity.builder()
                .id(movieId)
                .title("Inception")
                .genre("Sci-Fi")
                .durationMinutes(148)
                .build();

        when(movieRepository.findById(movieId)).thenReturn(Optional.of(movie));

        // 1st Read: Cache Miss -> Queries repository
        MovieEntity result1 = movieCatalogService.getMovieById(movieId);
        assertNotNull(result1);
        assertEquals("Inception", result1.getTitle());
        verify(movieRepository, times(1)).findById(movieId);

        // 2nd Read: Cache Hit -> Returns from Caffeine cache (0 DB calls!)
        MovieEntity result2 = movieCatalogService.getMovieById(movieId);
        assertNotNull(result2);
        assertEquals("Inception", result2.getTitle());
        verify(movieRepository, times(1)).findById(movieId); // Still 1 call!
    }
}
