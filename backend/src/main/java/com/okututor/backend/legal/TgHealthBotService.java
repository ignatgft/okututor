package com.okututor.backend.legal;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class TgHealthBotService {

    private static final Logger log = LoggerFactory.getLogger(TgHealthBotService.class);

    private final TgRecipientRepository recipientRepository;
    private final HttpClient http = HttpClient.newHttpClient();
    private final com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();

    @Value("${TG_BOT_TOKEN:}")
    private String botToken;

    @Value("${TG_BOT_ENABLED:false}")
    private boolean enabled;

    public TgHealthBotService(TgRecipientRepository recipientRepository) {
        this.recipientRepository = recipientRepository;
    }

    public void sendTest(String chatId) {
        send(chatId, "<b>Test OkuTutor</b>\nБот работает. ChatId: " + chatId, "INFO");
    }

    public void send(String chatId, String html, String severity) {
        String token = botToken != null && !botToken.isBlank() ? botToken : System.getenv("TG_BOT_TOKEN");
        if (token == null || token.isBlank() || chatId == null || chatId.isBlank()) {
            log.info("[TG mock] to {} severity {}: {}", chatId, severity, html.replaceAll("<[^>]+>", ""));
            return;
        }
        try {
            String url = "https://api.telegram.org/bot" + token + "/sendMessage";
            var payload = om.createObjectNode();
            payload.put("chat_id", chatId);
            payload.put("text", html);
            payload.put("parse_mode", "HTML");
            payload.put("disable_web_page_preview", true);
            var req = HttpRequest.newBuilder().uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString())).build();
            var resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) log.warn("TG send failed {}: {}", resp.statusCode(), resp.body());
        } catch (Exception e) { log.warn("TG send error", e); }
    }

    public void broadcast(String html, String severity) {
        List<TgRecipient> targets;
        if ("CRITICAL".equals(severity)) targets = recipientRepository.findByIsActiveTrue().stream().filter(TgRecipient::isNotifyCritical).toList();
        else if ("WARNING".equals(severity)) targets = recipientRepository.findByIsActiveTrue().stream().filter(TgRecipient::isNotifyWarning).toList();
        else targets = recipientRepository.findByIsActiveTrue();
        for (var r : targets) send(r.getChatId(), html, severity);
    }

    // Простой health чек раз в 60s — шлет в ТГ если бек падает (монолит, без внешнего Prometheus)
    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    public void scheduledHealth() {
        if (!enabled) return;
        try {
            // внутренний health — проверяем DB через recipientRepository.count()
            recipientRepository.count();
        } catch (Exception e) {
            broadcast("<b>CRITICAL — OkuTutor DB</b>\nDatabase unavailable: " + e.getMessage(), "CRITICAL");
        }
    }
}
