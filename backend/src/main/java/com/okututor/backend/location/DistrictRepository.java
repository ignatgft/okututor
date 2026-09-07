package com.okututor.backend.location;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DistrictRepository extends JpaRepository<District, UUID> {
    List<District> findByCityIdOrderByNameRu(UUID cityId);
    Optional<District> findByCitySlugAndSlug(String citySlug, String slug);
    // Spring Data derives correct? use explicit query for city.slug
    @org.springframework.data.jpa.repository.Query("select d from District d where d.city.slug = :citySlug and d.slug = :slug")
    Optional<District> findByCitySlug(@org.springframework.data.repository.query.Param("citySlug") String citySlug, @org.springframework.data.repository.query.Param("slug") String slug);
}
