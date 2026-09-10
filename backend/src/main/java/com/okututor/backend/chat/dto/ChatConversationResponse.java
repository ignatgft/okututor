package com.okututor.backend.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatConversationResponse(
        UUID id,
        UUID requestId,
        String status,
        Instant createdAt,
        Instant updatedAt,
        Instant lastMessageAt,
        String lastMessage,
        long unreadCount,
        UUID otherParticipantId,
        String otherParticipantName
) {}
