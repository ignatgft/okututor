package com.okututor.backend.legal;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CookieProviderRepository extends JpaRepository<CookieProvider, UUID> {
    @Query("SELECT p FROM CookieProvider p JOIN FETCH p.category WHERE p.isActive = true")
    List<CookieProvider> findByIsActiveTrue();

    @Query("SELECT p FROM CookieProvider p JOIN FETCH p.category")
    List<CookieProvider> findAllWithCategory();

    @Query("SELECT p FROM CookieProvider p JOIN FETCH p.category WHERE p.category.id = :categoryId")
    List<CookieProvider> findByCategoryId(UUID categoryId);
}
