package com.okututor.backend.seo;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeoSettingsRepository extends JpaRepository<SeoSettings, UUID> {
}
