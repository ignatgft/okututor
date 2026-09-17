package com.okututor.backend.legal;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LegalDocumentRepository extends JpaRepository<LegalDocument, UUID> {
    Optional<LegalDocument> findByType(String type);
}
