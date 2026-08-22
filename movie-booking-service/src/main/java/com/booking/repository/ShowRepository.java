package com.booking.repository;

import com.booking.entity.ShowEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShowRepository extends JpaRepository<ShowEntity, String> {
    List<ShowEntity> findByMovieId(String movieId);
    List<ShowEntity> findByScreenId(String screenId);
}
