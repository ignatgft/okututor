package com.okututor.monitoringbot.service;

import com.okututor.monitoringbot.config.BotProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

@Service
public class TelegramSender {

    private static final Logger log = LoggerFactory.getLogger(TelegramSender.class);
    private final BotProperties props;
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public TelegramSender(BotProperties props) {
        this.props = props;
    }

    public void send(String chatId, String text) {
        String token = props.getBotToken();
        if (token.isBlank()) {
            log.warn("BOT_TOKEN empty — skip send to {}", chatId);
            return;
        }
        try {
            String body = """
                    {"chat_id":"%s","text":%s,"parse_mode":"HTML","disable_web_page_preview":true}
                    """.formatted(chatId, jsonEscape(text));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.telegram.org/bot" + token + "/sendMessage"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            // async fire-and-forget, but log failures
            CompletableFuture<HttpResponse<String>> f = client.sendAsync(req, HttpResponse.BodyHandlers.ofString());
            f.whenComplete((resp, ex) -> {
                if (ex != null) log.error("sendTelegram failed chat={}: {}", chatId, ex.toString());
                else if (resp.statusCode() >= 400) log.warn("sendTelegram HTTP {} body={}", resp.statusCode(), resp.body());
            });
            // block briefly for alert path to ensure delivery
            try { f.get(6, java.util.concurrent.TimeUnit.SECONDS); } catch (Exception ignored) {}
        } catch (Exception e) {
            log.error("sendTelegram exception", e);
        }
    }

    private static String jsonEscape(String s) {
        if (s == null) return "\"\"";
        String escaped = s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
        return "\"" + escaped + "\"";
    }
}
