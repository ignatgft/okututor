package com.okututor.backend.chat;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    Page<ChatMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    Page<ChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId, Pageable pageable);

    List<ChatMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    long countByConversationIdAndReadAtIsNullAndSenderIdNot(UUID conversationId, UUID senderId);

    @Query("select count(m) from ChatMessage m where m.conversation.id = :conversationId and m.readAt is null and m.sender.id <> :userId")
    long countUnreadForConversation(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("select m.conversation.id, count(m) from ChatMessage m where m.conversation.id in :conversationIds and m.readAt is null and m.sender.id <> :userId group by m.conversation.id")
    List<Object[]> countUnreadGrouped(@Param("conversationIds") List<UUID> conversationIds, @Param("userId") UUID userId);

    @Query("select count(m) from ChatMessage m where m.conversation.id in :conversationIds and m.readAt is null and m.sender.id <> :userId")
    long countUnreadTotal(@Param("conversationIds") List<UUID> conversationIds, @Param("userId") UUID userId);

    @Modifying
    @Query("update ChatMessage m set m.readAt = :now where m.conversation.id = :conversationId and m.sender.id <> :userId and m.readAt is null")
    int markReadForConversation(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId, @Param("now") java.time.Instant now);

    @Query("select m from ChatMessage m where m.conversation.id = :conversationId order by m.createdAt desc")
    List<ChatMessage> findLatestByConversationId(@Param("conversationId") UUID conversationId, Pageable pageable);
}
