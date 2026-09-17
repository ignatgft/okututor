package com.okututor.backend.chat;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {
    Optional<ChatConversation> findByRequestId(UUID requestId);
    boolean existsByRequestId(UUID requestId);

    @org.springframework.data.jpa.repository.Query(
            "select c from ChatConversation c where c.id in (select p.conversation.id from ChatParticipant p where p.user.id = :userId) order by c.updatedAt desc")
    org.springframework.data.domain.Page<ChatConversation> findByParticipantUserId(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
            "select c from ChatConversation c where c.id in :ids order by c.updatedAt desc")
    java.util.List<ChatConversation> findByIdInOrderByUpdatedAtDesc(
            @org.springframework.data.repository.query.Param("ids") java.util.Collection<UUID> ids);
}
