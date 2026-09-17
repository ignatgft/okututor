package com.okututor.backend.legal;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/telegram")
public class TgAlertWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TgAlertWebhookController.class);
    private final TgHealthBotService botService;

    public TgAlertWebhookController(TgHealthBotService botService) { this.botService = botService; }

    // Alertmanager webhook — без auth, но проверяется что запрос из внутренней сети (Dokploy okututor network)
    @PostMapping("/alert")
    public Map<String, Object> alert(@RequestBody(required = false) Map<String, Object> payload,
                                     @RequestParam(required = false) String severity) {
        log.info("TG alert webhook severity={} payload={}", severity, payload);
        try {
            String sev = severity != null ? severity.toUpperCase() : "CRITICAL";
            String html = formatAlert(payload, sev);
            botService.broadcast(html, sev);
        } catch (Exception e) { log.warn("TG alert handling failed", e); }
        return Map.of("status", "ok");
    }

    private String formatAlert(Map<String, Object> payload, String severity) {
        if (payload == null) return "<b>" + severity + " — OkuTutor</b>\nAlertmanager webhook";
        try {
            List<Map<String, Object>> alerts = (List<Map<String, Object>>) payload.get("alerts");
            if (alerts == null || alerts.isEmpty()) return "<b>" + severity + " — OkuTutor</b>\n" + payload;
            StringBuilder sb = new StringBuilder("<b>").append(severity).append(" — OkuTutor</b>\n");
            for (var a : alerts) {
                var ann = (Map<String, Object>) a.get("annotations");
                var labels = (Map<String, Object>) a.get("labels");
                String summary = ann != null ? (String) ann.get("summary") : (String) labels.get("alertname");
                String desc = ann != null ? (String) ann.get("description") : "";
                sb.append("• ").append(summary != null ? summary : "Alert").append("\n");
                if (desc != null && !desc.isBlank()) sb.append(desc).append("\n");
            }
            return sb.toString();
        } catch (Exception e) { return "<b>" + severity + " — OkuTutor</b>\n" + payload; }
    }
}
