package com.okututor.backend.legal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LegalDocumentVersionRepository extends JpaRepository<LegalDocumentVersion, UUID> {
    List<LegalDocumentVersion> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<LegalDocumentVersion> findByDocumentIdAndLanguageOrderByCreatedAtDesc(UUID documentId, String language);
    Optional<LegalDocumentVersion> findByDocumentTypeAndLanguageAndStatus(String documentType, String language, LegalDocumentVersion.Status status);
    
    @Query("SELECT v FROM LegalDocumentVersion v JOIN FETCH v.document WHERE v.document.type = :type AND v.language = :language AND v.status = 'PUBLISHED' ORDER BY v.publishedAt DESC")
    Optional<LegalDocumentVersion> findPublishedByTypeAndLanguage(String type, String language);

    @Query("SELECT v FROM LegalDocumentVersion v JOIN FETCH v.document WHERE v.document.id = :documentId AND v.status = 'PUBLISHED'")
    Optional<LegalDocumentVersion> findPublishedByDocumentId(UUID documentId);

    @Query("SELECT v FROM LegalDocumentVersion v JOIN FETCH v.document WHERE v.document.id = :documentId ORDER BY v.createdAt DESC")
    List<LegalDocumentVersion> findByDocumentIdWithFetch(UUID documentId);
    
    List<LegalDocumentVersion> findByStatus(LegalDocumentVersion.Status status);
}
