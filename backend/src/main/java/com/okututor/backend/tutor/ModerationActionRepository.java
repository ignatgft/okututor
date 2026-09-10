package com.okututor.backend.tutor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationActionRepository extends JpaRepository<ModerationAction, UUID> {
    List<ModerationAction> findByTutorProfileIdOrderByCreatedAtDesc(UUID profileId);
}
