package com.okututor.backend.security;

import com.okututor.backend.auth.dto.AuthTokensResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * One-time code store for OAuth flow.
 * Mitigates token leakage via URL (Referer/logs/history) by redirecting with short-lived code
 * instead of access_token/refresh_token. Code is exchanged via POST /api/v1/auth/oauth/exchange.
 * TTL 2 minutes, single-use.
 */
@Component
public class OAuthCodeStore {

    private static final Duration TTL = Duration.ofMinutes(2);

    private record Entry(AuthTokensResponse tokens, Instant expiresAt) {}

    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public String create(AuthTokensResponse tokens) {
        String code = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString().substring(0, 8);
        store.put(code, new Entry(tokens, Instant.now().plus(TTL)));
        return code;
    }

    public AuthTokensResponse consume(String code) {
        if (code == null || code.isBlank()) {
            throw com.okututor.backend.common.error.ApiException.notFound("Invalid or expired code");
        }
        Entry e = store.remove(code);
        if (e == null) {
            throw com.okututor.backend.common.error.ApiException.notFound("Invalid or expired code");
        }
        if (e.expiresAt().isBefore(Instant.now())) {
            throw com.okututor.backend.common.error.ApiException.notFound("Code expired");
        }
        return e.tokens();
    }

    @Scheduled(fixedDelay = 60_000)
    public void evictExpired() {
        Instant now = Instant.now();
        store.entrySet().removeIf(en -> en.getValue().expiresAt().isBefore(now));
    }
}
