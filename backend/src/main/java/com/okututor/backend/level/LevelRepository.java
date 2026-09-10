package com.okututor.backend.level;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LevelRepository extends JpaRepository<Level, UUID> {
    Optional<Level> findBySlug(String slug);
}
