package com.okututor.backend.chat;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Одноразовые тикеты для WebSocket-handshake.
 *
 * <p>Браузерный WebSocket API не позволяет задать Authorization-заголовок,
 * поэтому JWT раньше передавался в query (?token=...) и светился в логах
 * прокси/сервера. Тикет — случайные 256 бит, TTL 60 секунд, single-use:
 * фронт получает его по аутентифицированному HTTPS (POST /api/v1/ws/ticket)
 * и подключается с ?ticket=... вместо сырого JWT.
 *
 * <p>Кэш переведён на Caffeine с автоматическим expireAfterWrite (60с)
 * и bounded maximumSize (10_000), исключая ручной purgeExpired и ConcurrentHashMap-утечки.
 */
@Service
public class WsTicketService {

    private static final long TTL_SECONDS = 60;
    private static final int MAX_ENTRIES = 10_000;

    private final Cache<String, UUID> tickets = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofSeconds(TTL_SECONDS))
            .maximumSize(MAX_ENTRIES)
            .build();

    private final SecureRandom random = new SecureRandom();

    public String issue(UUID userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String ticket = HexFormat.of().formatHex(bytes);
        tickets.put(ticket, userId);
        return ticket;
    }

    /**
     * @return userId либо null (неизвестный/протухший/уже использованный тикет).
     */
    public UUID consume(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return null;
        }
        String key = ticket.trim();
        UUID userId = tickets.getIfPresent(key);
        if (userId != null) {
            tickets.invalidate(key);
        }
        return userId;
    }
}
