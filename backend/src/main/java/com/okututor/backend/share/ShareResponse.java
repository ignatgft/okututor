package com.okututor.backend.share;

import java.time.Instant;
import java.util.UUID;

public record ShareResponse(
        UUID id,
        String token,
        String url,
        Instant createdAt,
        Instant expiresAt,
        long viewCount
) {}