package com.okututor.backend.legal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TgRecipientRepository extends JpaRepository<TgRecipient, UUID> {
    Optional<TgRecipient> findByChatId(String chatId);
    boolean existsByChatId(String chatId);
    List<TgRecipient> findByIsActiveTrue();
    List<TgRecipient> findByIsActiveTrueAndNotifyCriticalTrue();
}
