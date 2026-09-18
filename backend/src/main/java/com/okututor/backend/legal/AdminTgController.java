package com.okututor.backend.legal;

import com.okututor.backend.security.UserPrincipal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/telegram")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminTgController {

    private final TgRecipientService recipientService;
    private final TgRecipientRepository recipientRepository;
    private final TgHealthBotService botService;

    public AdminTgController(TgRecipientService recipientService, TgRecipientRepository recipientRepository, TgHealthBotService botService) {
        this.recipientService = recipientService;
        this.recipientRepository = recipientRepository;
        this.botService = botService;
    }

    @GetMapping("/recipients")
    public List<Map<String, Object>> list() {
        return recipientRepository.findAll().stream().map(this::toDto).toList();
    }

    @PostMapping("/recipients")
    public Map<String, Object> create(@RequestBody Map<String, Object> body, @AuthenticationPrincipal UserPrincipal principal) {
        TgRecipient r = recipientService.create(
                (String) body.get("chatId"),
                (String) body.get("username"),
                (String) body.get("displayName"),
                body.get("notifyCritical") != null ? (Boolean) body.get("notifyCritical") : null,
                body.get("notifyWarning") != null ? (Boolean) body.get("notifyWarning") : null,
                principal != null ? principal.id() : null);
        return toDto(r);
    }

    @PutMapping("/recipients/{id}")
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        TgRecipient r = recipientService.update(
                id,
                (String) body.get("chatId"),
                (String) body.get("username"),
                (String) body.get("displayName"),
                body.get("isActive") != null ? (Boolean) body.get("isActive") : null,
                body.get("notifyCritical") != null ? (Boolean) body.get("notifyCritical") : null,
                body.get("notifyWarning") != null ? (Boolean) body.get("notifyWarning") : null);
        return toDto(r);
    }

    private Map<String, Object> toDto(TgRecipient r) {
        return Map.of(
                "id", r.getId().toString(),
                "chatId", r.getChatId(),
                "username", r.getUsername() != null ? r.getUsername() : "",
                "displayName", r.getDisplayName() != null ? r.getDisplayName() : "",
                "isActive", r.isActive(),
                "notifyCritical", r.isNotifyCritical(),
                "notifyWarning", r.isNotifyWarning(),
                "createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : ""
        );
    }

    @DeleteMapping("/recipients/{id}")
    public void delete(@PathVariable UUID id) { recipientService.delete(id); }

    @PostMapping("/recipients/{id}/test")
    public Map<String, Object> test(@PathVariable UUID id) {
        recipientService.testSend(id, botService);
        return Map.of("status", "sent");
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        long total = recipientRepository.count();
        long active = recipientRepository.findByIsActiveTrue().size();
        return Map.of("total", total, "active", active);
    }
}
