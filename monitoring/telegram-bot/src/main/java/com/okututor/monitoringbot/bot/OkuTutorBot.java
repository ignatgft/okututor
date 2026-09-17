package com.okututor.monitoringbot.bot;

import com.okututor.monitoringbot.config.BotProperties;
import com.okututor.monitoringbot.service.TelegramSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Component
public class OkuTutorBot extends TelegramLongPollingBot {

    private static final Logger log = LoggerFactory.getLogger(OkuTutorBot.class);
    private final BotProperties props;
    private final TelegramSender sender;

    public OkuTutorBot(BotProperties props, TelegramSender sender) {
        super(props.getBotToken());
        this.props = props;
        this.sender = sender;
    }

    @Override
    public String getBotUsername() {
        return props.getBotUsername();
    }

    @Override
    public String getBotToken() {
        return props.getBotToken();
    }

    @Override
    public void onUpdateReceived(Update update) {
        if (update == null || !update.hasMessage() || !update.getMessage().hasText()) return;
        String text = update.getMessage().getText().trim();
        String chatId = String.valueOf(update.getMessage().getChatId());

        String command = text.split("\\s+")[0].toLowerCase();
        // support /start@botname
        if (command.contains("@")) command = command.substring(0, command.indexOf('@'));

        switch (command) {
            case "/start" -> handleStart(chatId);
            case "/chatid" -> handleChatId(chatId);
            case "/status" -> handleStatus(chatId);
            case "/test" -> handleTest(chatId);
            default -> {
                // ignore unknown
            }
        }
    }

    private void handleStart(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "Access denied."); return; }
        String msg = """
                OkuTutor Monitoring Bot

                Chat ID: <code>%s</code>

                Этот chat ID можно использовать для production alerts.
                Добавь его в <code>TELEGRAM_CHAT_ID</code> / <code>TELEGRAM_ALLOWED_CHAT_IDS</code> и перезапусти monitoring.
                Environment: %s
                """.formatted(chatId, props.getEnvironment());
        sendHtml(chatId, msg);
    }

    private void handleChatId(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "Access denied."); return; }
        send(chatId, "Chat ID: " + chatId);
    }

    private void handleStatus(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "Access denied."); return; }
        String am = checkAlertmanager();
        String configured = props.getPrimaryRecipient().isBlank() ? "no (set TELEGRAM_CHAT_ID)" : "yes";
        String grafana = props.getGrafanaUrl().isBlank() ? "not set" : props.getGrafanaUrl();
        String msg = "Bot: OK\nEnvironment: %s\nAlertmanager: %s\nConfigured recipient: %s\nGrafana: %s"
                .formatted(props.getEnvironment(), am, configured, grafana);
        send(chatId, msg);
    }

    private void handleTest(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "Access denied."); return; }
        String now = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC).format(Instant.now());
        String alert = """
                [TEST] OkuTutor

                Test alert from monitoring bot.
                Time: %s
                Environment: %s

                If you see this, Telegram delivery works.
                """.formatted(now, props.getEnvironment());
        sender.send(chatId, alert);
        send(chatId, "Test message sent.");
    }

    private String checkAlertmanager() {
        try {
            HttpClient c = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(props.getAlertmanagerUrl() + "/-/healthy"))
                    .timeout(Duration.ofSeconds(3))
                    .GET().build();
            HttpResponse<Void> r = c.send(req, HttpResponse.BodyHandlers.discarding());
            return r.statusCode() == 200 ? "OK" : "HTTP " + r.statusCode();
        } catch (Exception e) {
            return "unreachable: " + e.getMessage();
        }
    }

    private void send(String chatId, String text) {
        try {
            execute(SendMessage.builder().chatId(chatId).text(text).build());
        } catch (Exception e) {
            log.error("send failed chat={}: {}", chatId, e.toString());
        }
    }

    private void sendHtml(String chatId, String html) {
        try {
            SendMessage m = new SendMessage();
            m.setChatId(chatId);
            m.setText(html);
            m.setParseMode("HTML");
            execute(m);
        } catch (Exception e) {
            log.error("sendHtml failed", e);
        }
    }
}
