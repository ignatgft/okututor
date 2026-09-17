package com.okututor.backend.tutor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorProfileLevelRepository extends JpaRepository<TutorProfileLevel, UUID> {
    List<TutorProfileLevel> findByProfileId(UUID profileId);
    void deleteByProfileId(UUID profileId);
    @org.springframework.data.jpa.repository.Query("select l from TutorProfileLevel l join fetch l.level where l.profile.id in :profileIds")
    List<TutorProfileLevel> findByProfileIdIn(@org.springframework.data.repository.query.Param("profileIds") java.util.Collection<UUID> profileIds);
}
