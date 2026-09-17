package com.okututor.backend.tutor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorProfileSubjectRepository extends JpaRepository<TutorProfileSubject, UUID> {
    List<TutorProfileSubject> findByProfileId(UUID profileId);
    void deleteByProfileId(UUID profileId);
    @org.springframework.data.jpa.repository.Query("select s from TutorProfileSubject s join fetch s.subject where s.profile.id in :profileIds")
    List<TutorProfileSubject> findByProfileIdIn(@org.springframework.data.repository.query.Param("profileIds") java.util.Collection<UUID> profileIds);
}
