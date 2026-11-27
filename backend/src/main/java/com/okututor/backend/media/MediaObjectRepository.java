package com.okututor.backend.media;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaObjectRepository extends JpaRepository<MediaObject, UUID> {

    Optional<MediaObject> findByObjectKey(String objectKey);

    Optional<MediaObject> findFirstByKindAndOwner_IdOrderByCreatedAtDesc(MediaKind kind, UUID ownerId);

    Optional<MediaObject> findFirstByKindAndCourseIdOrderByCreatedAtDesc(MediaKind kind, UUID courseId);

    @Query("""
            select m from MediaObject m
            join fetch m.owner
            where m.kind = :kind
              and m.createdAt < :threshold
            """)
    List<MediaObject> findByKindAndOwnerIsNotNullAndCreatedAtBefore(@Param("kind") MediaKind kind,
                                                                    @Param("threshold") Instant threshold);

    @Query("""
            select m from MediaObject m
            where m.owner is null
              and m.courseId is null
              and m.createdAt < :threshold
              and not exists (select 1 from MessageAttachment a where a.media.id = m.id)
              and not exists (select 1 from MessageAttachment a2 join a2.thumbnail th where th.id = m.id)
              and not exists (select 1 from TutorProfileMedia pm where pm.media.id = m.id)
            """)
    List<MediaObject> findUnreferencedOrphansBefore(@Param("threshold") Instant threshold);
}
