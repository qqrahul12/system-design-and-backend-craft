package com.booking.service;

import com.booking.entity.MovieEntity;
import com.booking.repository.MovieRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class MovieCatalogService {

    private final MovieRepository movieRepository;

    public MovieCatalogService(MovieRepository movieRepository) {
        this.movieRepository = movieRepository;
    }

    @Cacheable(key = "#id", value = "movies")
    public MovieEntity getMovieById(String id) {
        return movieRepository.findById(id).orElse(null);
    }

    @CachePut(key = "#movie.id", value = "movies")
    public MovieEntity saveMovie(MovieEntity movie) {
        return movieRepository.save(movie);
    }

    @CacheEvict(value = "movies", key = "#id")
    public void deleteMovie(String id) {
        movieRepository.deleteById(id);
    }
}
