package com.okututor.backend.legal;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TgRecipientService {

    private final TgRecipientRepository recipientRepository;
    private final UserRepository userRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public TgRecipientService(TgRecipientRepository recipientRepository, UserRepository userRepository) {
        this.recipientRepository = recipientRepository;
        this.userRepository = userRepository;
    }

    public List<TgRecipient> listActive() { return recipientRepository.findByIsActiveTrue(); }
    public List<TgRecipient> listAll() { return recipientRepository.findAll(); }

    @Transactional
    public TgRecipient create(String chatId, String username, String displayName, Boolean notifyCritical, Boolean notifyWarning, UUID actorId) {
        String cid = normalizeChatId(chatId);
        if (recipientRepository.existsByChatId(cid)) throw ApiException.conflict("Recipient with chatId already exists");
        // pull from TG if username/displayName empty and token available
        if ((username == null || username.isBlank()) || (displayName == null || displayName.isBlank())) {
            var fetched = fetchTelegramUser(cid);
            if (fetched != null) {
                if (username == null || username.isBlank()) username = fetched.username;
                if (displayName == null || displayName.isBlank()) displayName = fetched.displayName;
            }
        }
        TgRecipient r = new TgRecipient();
        r.setChatId(cid);
        r.setUsername(username != null ? username.replace("@","").trim() : null);
        r.setDisplayName(displayName != null ? displayName.trim() : null);
        if (notifyCritical != null) r.setNotifyCritical(notifyCritical);
        if (notifyWarning != null) r.setNotifyWarning(notifyWarning);
        if (actorId != null) r.setCreatedBy(refUser(actorId));
        return recipientRepository.save(r);
    }

    @Transactional
    public TgRecipient update(UUID id, String chatId, String username, String displayName, Boolean isActive, Boolean notifyCritical, Boolean notifyWarning) {
        TgRecipient r = recipientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Recipient not found"));
        if (chatId != null && !chatId.isBlank()) {
            String cid = normalizeChatId(chatId);
            if (!cid.equals(r.getChatId()) && recipientRepository.existsByChatId(cid)) throw ApiException.conflict("chatId already exists");
            r.setChatId(cid);
            // re-fetch if username/displayName not provided
            if ((username == null || username.isBlank()) && (displayName == null || displayName.isBlank())) {
                var fetched = fetchTelegramUser(cid);
                if (fetched != null) {
                    if (username == null || username.isBlank()) username = fetched.username;
                    if (displayName == null || displayName.isBlank()) displayName = fetched.displayName;
                }
            }
        }
        if (username != null) r.setUsername(username.replace("@","").trim());
        if (displayName != null) r.setDisplayName(displayName.trim());
        if (isActive != null) r.setActive(isActive);
        if (notifyCritical != null) r.setNotifyCritical(notifyCritical);
        if (notifyWarning != null) r.setNotifyWarning(notifyWarning);
        return recipientRepository.save(r);
    }

    @Transactional
    public void delete(UUID id) {
        var r = recipientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Recipient not found"));
        // hard delete for simplicity (admin wants remove)
        recipientRepository.delete(r);
    }

    public void testSend(UUID id, TgHealthBotService botService) {
        TgRecipient r = recipientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Recipient not found"));
        botService.sendTest(r.getChatId());
    }

    private String normalizeChatId(String raw) {
        if (raw == null || raw.isBlank()) throw ApiException.validation("chatId is required");
        String cid = raw.trim();
        if (!cid.matches("-?\\d{5,32}")) throw ApiException.validation("chatId must be numeric Telegram userId (e.g. 123456789)");
        return cid;
    }

    private User refUser(UUID id) {
        if (id == null) return null;
        User u = new User();
        u.setId(id);
        return u;
    }

    // Try to fetch user via Telegram Bot API getChat — requires TG_BOT_TOKEN env
    private FetchedUser fetchTelegramUser(String chatId) {
        String token = System.getenv("TG_BOT_TOKEN");
        if (token == null) token = System.getProperty("TG_BOT_TOKEN");
        if (token == null || token.isBlank()) return null;
        try {
            String url = "https://api.telegram.org/bot" + token + "/getChat?chat_id=" + chatId;
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            var req = java.net.http.HttpRequest.newBuilder().uri(java.net.URI.create(url)).timeout(java.time.Duration.ofSeconds(5)).GET().build();
            var resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            var node = objectMapper.readTree(resp.body());
            if (!node.path("ok").asBoolean(false)) return null;
            var result = node.path("result");
            String username = result.path("username").asText(null);
            String first = result.path("first_name").asText("");
            String last = result.path("last_name").asText("");
            String display = (first + " " + last).trim();
            if (display.isBlank()) display = result.path("title").asText(null);
            return new FetchedUser(username, display.isBlank() ? null : display);
        } catch (Exception e) { return null; }
    }
    private record FetchedUser(String username, String displayName) {}
}
