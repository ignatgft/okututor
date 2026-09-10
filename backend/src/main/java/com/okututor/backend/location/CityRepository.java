package com.okututor.backend.location;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, UUID> {
    Optional<City> findBySlug(String slug);
}
