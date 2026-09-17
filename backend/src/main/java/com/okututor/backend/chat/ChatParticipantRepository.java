package com.okututor.backend.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, UUID> {

    Optional<ChatParticipant> findByConversationIdAndUserId(UUID conversationId, UUID userId);

    boolean existsByConversationIdAndUserId(UUID conversationId, UUID userId);

    List<ChatParticipant> findByConversationId(UUID conversationId);

    List<ChatParticipant> findByUserId(UUID userId);

    @Query("select p.conversation.id from ChatParticipant p where p.user.id = :userId")
    List<UUID> findConversationIdsByUserId(@Param("userId") UUID userId);

    @Query("select count(p) > 0 from ChatParticipant p where p.conversation.id = :conversationId and p.user.id = :userId")
    boolean isParticipant(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("select p from ChatParticipant p where p.conversation.id in :conversationIds")
    java.util.List<ChatParticipant> findByConversationIdIn(@Param("conversationIds") java.util.Collection<UUID> conversationIds);

    @Query("select p from ChatParticipant p where p.conversation.id = :conversationId and p.user.id <> :userId")
    java.util.List<ChatParticipant> findOtherParticipants(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
}
