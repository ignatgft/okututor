package com.okututor.backend.legal;

import com.okututor.backend.common.error.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/telegram")
public class TgAlertWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TgAlertWebhookController.class);
    private final TgHealthBotService botService;

    @Value("${app.telegram.alert-secret:${TG_ALERT_SECRET:}}")
    private String alertSecret;

    public TgAlertWebhookController(TgHealthBotService botService) { this.botService = botService; }

    // Alertmanager webhook — защищен секретным токеном (X-Alert-Secret или Authorization: Bearer).
    // По соображениям безопасности секрет НЕ принимается через URL query parameter во избежание утечки в логи.
    @PostMapping("/alert")
    public Map<String, Object> alert(@RequestHeader(value = "X-Alert-Secret", required = false) String secretHeader,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody(required = false) Map<String, Object> payload,
                                     @RequestParam(required = false) String severity,
                                     HttpServletRequest request) {
        String bearer = (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7).trim() : null;
        String providedSecret = secretHeader != null && !secretHeader.isBlank() ? secretHeader.trim() :
                (bearer != null && !bearer.isBlank() ? bearer : null);

        if (alertSecret == null || alertSecret.isBlank()) {
            log.error("TG alert webhook invoked but app.telegram.alert-secret is not configured. Failing closed.");
            throw ApiException.forbidden("Alert webhook is disabled: secret not configured");
        }

        if (providedSecret == null || !alertSecret.equals(providedSecret)) {
            log.warn("Unauthorized attempt to access TG alert webhook from IP={}", request.getRemoteAddr());
            throw ApiException.unauthorized("Invalid or missing alert secret");
        }

        log.info("TG alert webhook received: severity={}", severity != null ? severity : "auto");
        try {
            String sev = severity != null ? severity.toUpperCase() : deriveSeverity(payload);
            String html = formatAlert(payload, sev);
            // нормализуем для broadcast (CRITICAL / WARNING / INFO)
            String normalized = normalizeSeverity(sev);
            botService.broadcast(html, normalized);
        } catch (Exception e) { log.warn("TG alert handling failed: {}", e.getMessage()); }
        return Map.of("status", "ok");
    }

    private String deriveSeverity(Map<String, Object> payload) {
        if (payload == null) return "CRITICAL";
        try {
            String status = String.valueOf(payload.getOrDefault("status", "firing"));
            if ("resolved".equalsIgnoreCase(status)) return "INFO";
            List<Map<String, Object>> alerts = (List<Map<String, Object>>) payload.get("alerts");
            if (alerts != null && !alerts.isEmpty()) {
                for (var a : alerts) {
                    var labels = (Map<String, Object>) a.get("labels");
                    if (labels != null && labels.get("severity") != null) {
                        String s = String.valueOf(labels.get("severity")).toUpperCase();
                        if ("CRITICAL".equals(s) || "WARNING".equals(s)) return s;
                    }
                }
            }
            var commonLabels = (Map<String, Object>) payload.get("commonLabels");
            if (commonLabels != null && commonLabels.get("severity") != null) {
                return String.valueOf(commonLabels.get("severity")).toUpperCase();
            }
        } catch (Exception ignored) {}
        return "CRITICAL";
    }

    private String normalizeSeverity(String sev) {
        if (sev == null) return "CRITICAL";
        String u = sev.toUpperCase();
        if (u.contains("CRITICAL") || u.contains("КРИТ")) return "CRITICAL";
        if (u.contains("WARNING") || u.contains("WARN") || u.contains("ВНИМ")) return "WARNING";
        return "INFO";
    }

    private String formatAlert(Map<String, Object> payload, String severity) {
        if (payload == null) return header(severity, "firing") + "\nВебхук Alertmanager без данных";
        try {
            List<Map<String, Object>> alerts = (List<Map<String, Object>>) payload.get("alerts");
            if (alerts == null || alerts.isEmpty()) return header(severity, String.valueOf(payload.getOrDefault("status", "firing"))) + "\n" + escapeHtml(String.valueOf(payload));

            String overallStatus = String.valueOf(payload.getOrDefault("status", "firing"));
            StringBuilder sb = new StringBuilder(header(severity, overallStatus)).append("\n");

            // Группировка: показываем кол-во алертов
            if (alerts.size() > 1) {
                sb.append("Всего событий: ").append(alerts.size()).append("\n");
            }
            sb.append("\n");

            for (var a : alerts) {
                var ann = (Map<String, Object>) a.get("annotations");
                var labels = (Map<String, Object>) a.get("labels");
                String alertname = labels != null ? String.valueOf(labels.getOrDefault("alertname", "Alert")) : "Alert";
                String status = String.valueOf(a.getOrDefault("status", overallStatus));
                String service = labels != null ? String.valueOf(labels.getOrDefault("service", labels.getOrDefault("job", ""))) : "";
                String sevLabel = labels != null ? String.valueOf(labels.getOrDefault("severity", severity)) : severity;

                String summary = ann != null ? (String) ann.get("summary") : null;
                String desc = ann != null ? (String) ann.get("description") : null;
                if (summary == null || summary.isBlank()) summary = translateAlertName(alertname);

                String icon = iconFor(sevLabel, status);
                sb.append(icon).append(" <b>").append(escapeHtml(summary)).append("</b>\n");
                if (!service.isBlank() && !"null".equals(service)) sb.append("   Сервис: <code>").append(escapeHtml(service)).append("</code>\n");
                sb.append("   Статус: ").append("resolved".equalsIgnoreCase(status) ? "✅ Восстановлено" : "🔥 Срабатывание").append("\n");
                String sevRu = severityRu(sevLabel);
                sb.append("   Уровень: ").append(sevRu).append("\n");
                if (desc != null && !desc.isBlank()) sb.append("   Детали: ").append(escapeHtml(desc)).append("\n");
                // время начала
                Object startsAt = a.get("startsAt");
                if (startsAt != null) sb.append("   Время: ").append(escapeHtml(String.valueOf(startsAt))).append("\n");
                sb.append("\n");
            }
            sb.append("Время уведомления: ").append(Instant.now()).append("\n");
            if ("resolved".equalsIgnoreCase(overallStatus)) {
                sb.append("Действие не требуется — проблема устранена.");
            } else if (normalizeSeverity(severity).equals("CRITICAL")) {
                sb.append("⚡ Требуется внимание: проверьте логи и Grafana.");
            } else {
                sb.append("ℹ️ Рекомендуется проверить метрики, если повторится.");
            }
            return sb.toString();
        } catch (Exception e) {
            return header(severity, "firing") + "\n" + escapeHtml(String.valueOf(payload));
        }
    }

    private String header(String severity, String status) {
        boolean resolved = "resolved".equalsIgnoreCase(status);
        if (resolved) return "<b>✅ ВОССТАНОВЛЕНО — OkuTutor</b>";
        String norm = normalizeSeverity(severity);
        if ("CRITICAL".equals(norm)) return "<b>🔴 КРИТИЧНО — OkuTutor</b>";
        if ("WARNING".equals(norm)) return "<b>🟡 ВНИМАНИЕ — OkuTutor</b>";
        return "<b>ℹ️ ИНФО — OkuTutor</b>";
    }

    private String severityRu(String sev) {
        if (sev == null) return "неизвестно";
        String u = sev.toUpperCase();
        if (u.contains("CRITICAL")) return "🔴 Критично";
        if (u.contains("WARNING") || u.contains("WARN")) return "🟡 Предупреждение";
        if (u.contains("INFO")) return "ℹ️ Инфо";
        return escapeHtml(sev);
    }

    private String iconFor(String sev, String status) {
        if ("resolved".equalsIgnoreCase(status)) return "✅";
        String n = normalizeSeverity(sev);
        if ("CRITICAL".equals(n)) return "🔴";
        if ("WARNING".equals(n)) return "🟡";
        return "ℹ️";
    }

    private String translateAlertName(String alertname) {
        if (alertname == null) return "Оповещение";
        return switch (alertname) {
            case "InstanceDown" -> "Бэкенд недоступен";
            case "PrometheusDown" -> "Prometheus недоступен";
            case "BackendHighErrorRate" -> "Высокая доля ошибок 5xx";
            case "BackendElevated4xx" -> "Повышенная доля ошибок 4xx";
            case "BackendHighLatency" -> "Высокая задержка p95";
            case "JvmHeapHigh" -> "Высокое потребление памяти JVM (heap)";
            case "JvmGcOverhead" -> "Высокая нагрузка сборщика мусора JVM";
            case "DbPoolExhaustion" -> "Пул соединений БД почти исчерпан";
            case "DbPoolPendingHigh" -> "Очередь ожидания БД";
            case "LokiDown" -> "Loki недоступен";
            default -> alertname;
        };
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
