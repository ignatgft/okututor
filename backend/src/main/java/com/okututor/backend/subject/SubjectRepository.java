package com.okututor.backend.subject;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    Optional<Subject> findBySlug(String slug);
}
