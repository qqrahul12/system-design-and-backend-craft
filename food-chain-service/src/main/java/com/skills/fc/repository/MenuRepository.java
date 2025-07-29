package com.skills.fc.repository;

import com.skills.fc.model.MenuItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface MenuRepository extends JpaRepository<MenuItem, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MenuItem m WHERE m.id = :id")
    Optional<MenuItem> findByIdForUpdate(UUID id);
}
