package com.okututor.backend.tutor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorProfileLevelRepository extends JpaRepository<TutorProfileLevel, UUID> {
    List<TutorProfileLevel> findByProfileId(UUID profileId);
    void deleteByProfileId(UUID profileId);
}
