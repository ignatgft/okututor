package com.okututor.backend.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderName,
        String body,
        Instant createdAt,
        Instant readAt
) {}
