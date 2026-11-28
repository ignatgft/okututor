package com.okututor.backend.support;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupportTicketMessageRepository extends JpaRepository<SupportTicketMessage, UUID> {

    @Query(value = """
            select m from SupportTicketMessage m
            join fetch m.sender
            where m.ticket.number = :ticketNumber
            order by m.createdAt asc
            """,
            countQuery = "select count(m) from SupportTicketMessage m where m.ticket.number = :ticketNumber")
    Page<SupportTicketMessage> findByTicketNumberOrderByCreatedAtAsc(@Param("ticketNumber") Long ticketNumber,
                                                                     Pageable pageable);

    default boolean isAuthorizedTicketParticipant(UUID mediaId, UUID userId) {
        return isAuthorizedTicketParticipant(mediaId, userId, SupportTicketMessage.Type.USER_VISIBLE);
    }

    /**
     * Явные LEFT JOIN исключают потерю неназначенных тикетов (assignedAdmin IS NULL)
     * и файловых вложений без миниатюры (thumbnail IS NULL) в Hibernate.
     */
    @Query("""
            select count(m) > 0 from SupportTicketMessage m
            join m.ticket t
            join m.attachment a
            join a.media med
            left join a.thumbnail th
            left join t.assignedAdmin adm
            where (med.id = :mediaId or th.id = :mediaId)
              and (
                  (t.author.id = :userId and m.type = :visibleType)
                  or adm.id = :userId
              )
            """)
    boolean isAuthorizedTicketParticipant(@Param("mediaId") UUID mediaId,
                                          @Param("userId") UUID userId,
                                          @Param("visibleType") SupportTicketMessage.Type visibleType);
}
