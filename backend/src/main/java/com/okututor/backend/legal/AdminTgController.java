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
    public List<TgRecipient> list() { return recipientRepository.findAll(); }

    @PostMapping("/recipients")
    public TgRecipient create(@RequestBody Map<String, Object> body, @AuthenticationPrincipal UserPrincipal principal) {
        return recipientService.create(
                (String) body.get("chatId"),
                (String) body.get("username"),
                (String) body.get("displayName"),
                body.get("notifyCritical") != null ? (Boolean) body.get("notifyCritical") : null,
                body.get("notifyWarning") != null ? (Boolean) body.get("notifyWarning") : null,
                principal != null ? principal.id() : null);
    }

    @PutMapping("/recipients/{id}")
    public TgRecipient update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return recipientService.update(
                id,
                (String) body.get("chatId"),
                (String) body.get("username"),
                (String) body.get("displayName"),
                body.get("isActive") != null ? (Boolean) body.get("isActive") : null,
                body.get("notifyCritical") != null ? (Boolean) body.get("notifyCritical") : null,
                body.get("notifyWarning") != null ? (Boolean) body.get("notifyWarning") : null);
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
