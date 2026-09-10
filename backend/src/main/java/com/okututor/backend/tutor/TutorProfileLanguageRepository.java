package com.okututor.backend.tutor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorProfileLanguageRepository extends JpaRepository<TutorProfileLanguage, UUID> {
    List<TutorProfileLanguage> findByProfileId(UUID profileId);
    void deleteByProfileId(UUID profileId);
    List<TutorProfileLanguage> findByProfileIdIn(java.util.Collection<UUID> profileIds);
}
