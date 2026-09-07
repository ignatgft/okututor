package com.okututor.backend.tutor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorProfileSubjectRepository extends JpaRepository<TutorProfileSubject, UUID> {
    List<TutorProfileSubject> findByProfileId(UUID profileId);
    void deleteByProfileId(UUID profileId);
}
