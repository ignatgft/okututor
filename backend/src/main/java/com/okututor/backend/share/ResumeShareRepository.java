package com.okututor.backend.share;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResumeShareRepository extends JpaRepository<ResumeShare, UUID> {

    Optional<ResumeShare> findByToken(String token);

    @Query("""
            select s from ResumeShare s
            join fetch s.tutorProfile tp
            join fetch tp.user
            left join fetch tp.city
            left join fetch tp.district
            where s.token = :token
            """)
    Optional<ResumeShare> findByTokenWithProfile(@Param("token") String token);

    @Query("select s from ResumeShare s where s.tutorProfile.id = :profileId and s.createdBy.id = :userId")
    Optional<ResumeShare> findForOwner(@Param("profileId") UUID profileId, @Param("userId") UUID userId);

    List<ResumeShare> findByCreatedById(UUID userId);

    @Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByTutorProfileIdAndCreatedById(UUID tutorProfileId, UUID userId);
}