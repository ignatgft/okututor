package com.okututor.monitoringbot.bot;

import com.okututor.monitoringbot.config.BotProperties;
import com.okututor.monitoringbot.service.TelegramSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;

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

        String lowerText = text.toLowerCase();
        switch (command) {
            case "/start" -> handleStart(chatId);
            case "/chatid", "/chat_id" -> handleChatId(chatId);
            case "/status" -> handleStatus(chatId);
            case "/test" -> handleTest(chatId);
            case "/help", "/помощь" -> handleHelp(chatId);
            case "/cpu", "/нагрузка" -> handleCpu(chatId);
            default -> {
                if (lowerText.contains("статус") || lowerText.contains("status")) handleStatus(chatId);
                else if (lowerText.contains("помощь") || lowerText.contains("help")) handleHelp(chatId);
                else if (lowerText.contains("тест") || lowerText.contains("test")) handleTest(chatId);
                else if (lowerText.contains("нагрузка") || lowerText.contains("cpu")) handleCpu(chatId);
                else if (lowerText.contains("grafana") || lowerText.contains("графана")) {
                    String url = props.getGrafanaUrl().isBlank() ? "http://localhost:3000" : props.getGrafanaUrl();
                    sendHtmlWithKeyboard(chatId, "📈 Grafana: <a href=\"" + url + "\">" + url + "</a>");
                }
                else if (lowerText.contains("chat")) handleChatId(chatId);
                else handleHelp(chatId);
            }
        }
    }

    private void handleStart(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "⛔ Доступ запрещён. Ваш Chat ID: " + chatId); return; }
        String msg = """
                <b>🎓 OkuTutor — Мониторинг</b>

                Привет! Я бот для алертов.

                Твой <b>Chat ID:</b> <code>%s</code>
                Скопируй его в <code>TELEGRAM_CHAT_ID</code> / <code>TELEGRAM_ALLOWED_CHAT_IDS</code> и перезапусти <code>monitoring</code>.

                Окружение: <b>%s</b>
                Бот: <b>%s</b>

                Выбери действие кнопкой ниже.
                """.formatted(chatId, props.getEnvironment(), props.getBotUsername());
        sendHtmlWithKeyboard(chatId, msg);
    }

    private void handleChatId(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "⛔ Доступ запрещён."); return; }
        sendHtml(chatId, "🆔 Твой Chat ID: <code>" + chatId + "</code>");
    }

    private void handleStatus(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "⛔ Доступ запрещён."); return; }
        String am = checkAlertmanager();
        String configured = props.getPrimaryRecipient().isBlank() ? "❌ не задан (укажи TELEGRAM_CHAT_ID)" : "✅ " + props.getPrimaryRecipient();
        String grafana = props.getGrafanaUrl().isBlank() ? "не задан" : props.getGrafanaUrl();
        String uptime = java.time.Duration.ofMillis(java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime()).toString().replace("PT","").toLowerCase();
        String msg = """
                <b>📊 Статус системы</b>

                🤖 Бот: <b>работает</b> (up %s)
                🌍 Окружение: <b>%s</b>
                🚨 Alertmanager: <b>%s</b>
                📨 Получатель: <code>%s</code>
                📈 Grafana: %s

                Нажми «Помощь» для списка команд.
                """.formatted(uptime, props.getEnvironment(), am, configured, grafana);
        sendHtmlWithKeyboard(chatId, msg);
    }

    private void handleTest(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "⛔ Доступ запрещён."); return; }
        String now = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC).format(Instant.now());
        String alert = """
                <b>[ТЕСТ] OkuTutor — Критический алерт</b>

                🕐 Время: %s
                🌍 Окружение: %s
                🖥️ Сервис: okututor-backend
                💬 Если видишь это сообщение — доставка в Telegram работает!

                <i>Эмуляция Alertmanager → Telegram</i>
                """.formatted(now, props.getEnvironment());
        sender.send(chatId, alert);
        send(chatId, "✅ Тестовый алерт отправлен на " + chatId);
    }

    private void handleHelp(String chatId) {
        String msg = """
                <b>📚 Команды OkuTutor Bot</b>

                /start — приветствие и Chat ID
                /chatid — показать твой Chat ID
                /status — статус бота, Alertmanager, Grafana
                /test — отправить тестовый критический алерт
                /help — эта справка
                /cpu — нагрузка сервера (CPU/RAM/диск)
                """;
        sendHtmlWithKeyboard(chatId, msg);
    }

    private void handleCpu(String chatId) {
        if (!props.isAllowed(chatId)) { send(chatId, "⛔ Доступ запрещён."); return; }
        Runtime rt = Runtime.getRuntime();
        long total = rt.totalMemory(), free = rt.freeMemory(), used = total - free;
        String mem = String.format("RAM бота: %.1f / %.1f MB", used / 1_048_576.0, total / 1_048_576.0);
        String msg = """
                <b>🖥️ Нагрузка сервера</b>

                %s
                CPU: данные в Grafana → <a href="%s">Открыть Grafana</a>
                Диск/сеть — смотри дашборд <b>Node Exporter / USE Method</b> в Grafana.

                Совет: добавь <code>node-exporter</code> (уже в compose) и открой <code>/d/node-exporter-full</code>.
                """.formatted(mem, props.getGrafanaUrl().isBlank() ? "http://localhost:3000" : props.getGrafanaUrl());
        sendHtml(chatId, msg);
    }

    private ReplyKeyboardMarkup mainKeyboard() {
        KeyboardRow r1 = new KeyboardRow(); r1.add("📊 Статус"); r1.add("🧪 Тест");
        KeyboardRow r2 = new KeyboardRow(); r2.add("🆔 Chat ID"); r2.add("🖥️ Нагрузка");
        KeyboardRow r3 = new KeyboardRow(); r3.add("📚 Помощь"); r3.add("📈 Grafana");
        ReplyKeyboardMarkup k = new ReplyKeyboardMarkup();
        k.setKeyboard(java.util.List.of(r1, r2, r3));
        k.setResizeKeyboard(true);
        k.setOneTimeKeyboard(false);
        return k;
    }

    private void sendHtmlWithKeyboard(String chatId, String html) {
        try {
            SendMessage m = new SendMessage();
            m.setChatId(chatId);
            m.setText(html);
            m.setParseMode("HTML");
            m.setReplyMarkup(mainKeyboard());
            execute(m);
        } catch (Exception e) {
            log.error("sendHtmlWithKeyboard failed", e);
        }
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
