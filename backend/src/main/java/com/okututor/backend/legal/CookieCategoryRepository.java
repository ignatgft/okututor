package com.okututor.backend.legal;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CookieCategoryRepository extends JpaRepository<CookieCategory, UUID> {
    Optional<CookieCategory> findByCode(String code);
}
