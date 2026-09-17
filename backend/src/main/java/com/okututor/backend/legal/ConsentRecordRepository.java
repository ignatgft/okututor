package com.okututor.backend.legal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, UUID> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "document", "documentVersion"})
    Page<ConsentRecord> findByUserId(UUID userId, Pageable pageable);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "document", "documentVersion"})
    List<ConsentRecord> findByUserIdAndDocumentId(UUID userId, UUID documentId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "document", "documentVersion"})
    List<ConsentRecord> findByUserIdAndStatus(UUID userId, ConsentRecord.Status status);
    
    @Query("SELECT c FROM ConsentRecord c WHERE " +
           "(:userId IS NULL OR c.user.id = :userId) AND " +
           "(:documentId IS NULL OR c.document.id = :documentId) AND " +
           "(:versionId IS NULL OR c.documentVersion.id = :versionId) AND " +
           "(:consentType IS NULL OR c.consentType = :consentType) AND " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:from IS NULL OR c.createdAt >= :from) AND " +
           "(:to IS NULL OR c.createdAt <= :to)")
    Page<ConsentRecord> findFiltered(UUID userId, UUID documentId, UUID versionId, 
                                      ConsentRecord.ConsentType consentType, ConsentRecord.Status status,
                                      Instant from, Instant to, Pageable pageable);
    
    long countByStatus(ConsentRecord.Status status);
    long countByConsentTypeAndStatus(ConsentRecord.ConsentType type, ConsentRecord.Status status);
}
