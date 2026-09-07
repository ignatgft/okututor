package com.okututor.backend.request;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorRequestRepository extends JpaRepository<TutorRequest, UUID> {
    Page<TutorRequest> findByTutorUserIdOrderByCreatedAtDesc(UUID tutorUserId, Pageable pageable);
    Page<TutorRequest> findByStudentUserIdOrderByCreatedAtDesc(UUID studentUserId, Pageable pageable);
    Page<TutorRequest> findByTutorProfileIdOrderByCreatedAtDesc(UUID profileId, Pageable pageable);
    long countByTutorUserIdAndStatus(UUID tutorUserId, TutorRequest.Status status);
    long countByStatus(TutorRequest.Status status);
}
