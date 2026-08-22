package com.booking.repository;

import com.booking.entity.ShowSeatEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShowSeatRepository extends JpaRepository<ShowSeatEntity, String> {

    List<ShowSeatEntity> findByShowId(String showId);

    Optional<ShowSeatEntity> findByShowIdAndSeatNumber(String showId, String seatNumber);

    /**
     * Pessimistic Write Lock for a specific show seat (SELECT ... FOR UPDATE)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ShowSeatEntity s WHERE s.showId = :showId AND s.seatNumber = :seatNumber")
    Optional<ShowSeatEntity> findByShowIdAndSeatNumberPessimistic(@Param("showId") String showId, @Param("seatNumber") String seatNumber);
}
