package com.okututor.backend.monitoring;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only endpoint to expose Telegram recipient status without leaking token.
 * Returns only chatId + connected flag.
 */
@RestController
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class MonitoringTelegramController {

    private final MonitoringProperties properties;

    public MonitoringTelegramController(MonitoringProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/api/v1/admin/monitoring/telegram")
    public ResponseEntity<Map<String, Object>> status() {
        String chatId = properties.getTelegram().getChatId();
        boolean connected = chatId != null && !chatId.isBlank();
        // never return token
        return ResponseEntity.ok(Map.of(
                "chatId", connected ? chatId : "",
                "connected", connected,
                "enabled", properties.getTelegram().isEnabled()
        ));
    }

    @PostMapping("/api/v1/admin/monitoring/telegram/connect")
    public ResponseEntity<Map<String, Object>> connect() {
        // stateless: just returns current config; bot token stays in env
        return status();
    }
}
