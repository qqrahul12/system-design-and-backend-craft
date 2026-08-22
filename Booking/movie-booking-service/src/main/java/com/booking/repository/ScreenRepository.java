package com.booking.repository;

import com.booking.entity.ScreenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreenRepository extends JpaRepository<ScreenEntity, String> {
    List<ScreenEntity> findByTheatreId(String theatreId);
}
