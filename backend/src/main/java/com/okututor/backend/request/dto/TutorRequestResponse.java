package com.okututor.backend.request.dto;

import java.time.Instant;
import java.util.UUID;

public record TutorRequestResponse(
        UUID id,
        UUID tutorProfileId,
        String tutorSlug,
        UUID tutorUserId,
        UUID studentUserId,
        String studentName,
        String studentContact,
        String message,
        String status,
        Instant createdAt,
        Instant updatedAt
) {}
