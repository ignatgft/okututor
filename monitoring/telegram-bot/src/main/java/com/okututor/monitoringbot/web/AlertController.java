package com.okututor.monitoringbot.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.okututor.monitoringbot.config.BotProperties;
import com.okututor.monitoringbot.service.TelegramSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class AlertController {

    private static final Logger log = LoggerFactory.getLogger(AlertController.class);
    private final BotProperties props;
    private final TelegramSender sender;
    private final ObjectMapper om = new ObjectMapper();

    public AlertController(BotProperties props, TelegramSender sender) {
        this.props = props;
        this.sender = sender;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        boolean ok = !props.getBotToken().isBlank();
        return Map.of("status", ok ? "ok" : "no_token", "environment", props.getEnvironment());
    }

    @PostMapping("/alert")
    public ResponseEntity<Map<String, Object>> alert(@RequestBody(required = false) String body) {
        if (body == null || body.isBlank()) return ResponseEntity.ok(Map.of("ok", true));
        try {
            JsonNode root = om.readTree(body);
            JsonNode alertsNode = root.get("alerts");
            String status = root.has("status") ? root.get("status").asText("firing") : "firing";
            if (alertsNode == null || !alertsNode.isArray() || alertsNode.isEmpty()) {
                return ResponseEntity.ok(Map.of("ok", true));
            }

            String primary = props.getPrimaryRecipient();
            if (primary.isBlank()) {
                log.warn("No TELEGRAM_CHAT_ID — dropping {} alerts", alertsNode.size());
                return ResponseEntity.ok(Map.of("ok", true, "warning", "no recipient"));
            }
            Set<String> recipients = props.getAllowedSet();
            if (recipients.isEmpty()) recipients = Set.of(primary);

            int delivered = 0;
            int limit = Math.min(alertsNode.size(), 10);
            for (int i = 0; i < limit; i++) {
                JsonNode a = alertsNode.get(i);
                JsonNode labels = a.get("labels");
                JsonNode ann = a.get("annotations");
                String alertname = labels != null && labels.has("alertname") ? labels.get("alertname").asText("Unknown") : "Unknown";
                String severity = labels != null && labels.has("severity") ? labels.get("severity").asText("warning") : "warning";
                String service = labels != null && labels.has("service") ? labels.get("service").asText("okututor-backend") : "okututor-backend";
                String aStatus = a.has("status") ? a.get("status").asText(status) : status;
                boolean resolved = "resolved".equalsIgnoreCase(aStatus);

                // Перевод severity на русский + эмодзи (варнинги, ошибки, критика)
                String sevRu;
                String emoji;
                String levelDesc;
                String sevLower = severity.toLowerCase();
                switch (sevLower) {
                    case "critical" -> { sevRu = "КРИТИЧНО"; emoji = "🔴"; levelDesc = "Критический — требуется немедленное вмешательство"; }
                    case "warning" -> { sevRu = "ВНИМАНИЕ"; emoji = "🟡"; levelDesc = "Предупреждение — проверьте при первой возможности"; }
                    case "error" -> { sevRu = "ОШИБКА"; emoji = "❌"; levelDesc = "Ошибка — проверьте логи"; }
                    case "info" -> { sevRu = "ИНФО"; emoji = "ℹ️"; levelDesc = "Инфо — к сведению"; }
                    default -> { sevRu = severity.toUpperCase(); emoji = "🔔"; levelDesc = sevRu; }
                }
                String prefix = resolved ? "✅ ВОССТАНОВЛЕНО — OkuTutor" : emoji + " " + sevRu + " — OkuTutor";
                String starts = a.has("startsAt") ? a.get("startsAt").asText("").substring(0, Math.min(16, a.get("startsAt").asText("").length())).replace("T", " ") : "";
                String summary = ann != null && ann.has("summary") ? ann.get("summary").asText("") : "";
                String description = ann != null && ann.has("description") ? ann.get("description").asText("") : "";
                // человекочитаемое имя алерта на русском
                String alertRu = translateAlert(alertname);

                List<String> lines = new ArrayList<>();
                lines.add("<b>" + prefix + "</b>");
                lines.add("");
                lines.add("🔔 <b>Тревога:</b> " + escapeHtml(alertRu) + " <code>(" + escapeHtml(alertname) + ")</code>");
                lines.add("🖥️ <b>Сервис:</b> " + escapeHtml(service));
                lines.add("🌍 <b>Окружение:</b> " + escapeHtml(props.getEnvironment()));
                String sevLine = "⚡ <b>Уровень:</b> " + sevRu + " — " + levelDesc + (resolved ? " (восстановлено)" : "");
                lines.add(sevLine);
                if (!summary.isBlank()) lines.add("\n📝 <b>Кратко:</b> " + escapeHtml(summary));
                if (!description.isBlank()) lines.add("ℹ️ <b>Детали:</b> " + escapeHtml(description));
                if (!resolved) {
                    if (!starts.isBlank()) lines.add("\n⏰ <b>Начало:</b> " + escapeHtml(starts) + " UTC");
                    // совет по severity
                    if ("critical".equals(sevLower)) lines.add("⚡ <b>Действие:</b> срочно проверьте логи, Grafana и состояние сервиса!");
                    else if ("warning".equals(sevLower)) lines.add("🔍 <b>Совет:</b> проверьте метрики, если повторится — эскалируйте.");
                    else lines.add("💡 <b>Совет:</b> к сведению, наблюдение.");
                } else {
                    lines.add("\n✅ <b>Восстановлено</b> — проблема устранена, действие не требуется.");
                }
                if (!props.getGrafanaUrl().isBlank()) lines.add("\n📈 Grafana: " + escapeHtml(props.getGrafanaUrl()));
                lines.add("\n—\nКнопки: /status — статус, /test — тест, /help — помощь");

                String text = String.join("\n", lines);
                for (String rcpt : recipients) {
                    sender.send(rcpt, text);
                    try { Thread.sleep(50); } catch (InterruptedException ignored) {}
                }
                delivered++;
            }
            return ResponseEntity.ok(Map.of("ok", true, "delivered", delivered));
        } catch (Exception e) {
            log.error("alert webhook parse failed", e);
            return ResponseEntity.ok(Map.of("ok", false, "error", e.getMessage()));
        }
    }

    private String translateAlert(String name) {
        if (name == null) return "Неизвестно";
        return switch (name) {
            case "InstanceDown" -> "Бэкенд недоступен";
            case "PrometheusDown" -> "Prometheus недоступен";
            case "BackendHighErrorRate" -> "Высокая доля ошибок 5xx";
            case "BackendElevated4xx" -> "Повышенная доля ошибок 4xx";
            case "BackendHighLatency" -> "Высокая задержка p95";
            case "JvmHeapHigh" -> "Переполнение памяти JVM heap";
            case "JvmGcOverhead" -> "Перегрузка сборщика мусора JVM";
            case "DbPoolExhaustion" -> "Исчерпание пула БД";
            case "DbPoolPendingHigh" -> "Очередь ожидания БД";
            case "LokiDown" -> "Loki недоступен";
            case "SimulatedCritical" -> "Тестовая критическая тревога";
            default -> name;
        };
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
