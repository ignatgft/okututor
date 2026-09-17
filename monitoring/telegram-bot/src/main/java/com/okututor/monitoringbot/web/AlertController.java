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

                String prefix = resolved ? "[RESOLVED] OkuTutor" : "[" + severity.toUpperCase() + "] OkuTutor";
                String starts = a.has("startsAt") ? a.get("startsAt").asText("").substring(0, Math.min(16, a.get("startsAt").asText("").length())).replace("T", " ") : "";
                String summary = ann != null && ann.has("summary") ? ann.get("summary").asText("") : "";
                String description = ann != null && ann.has("description") ? ann.get("description").asText("") : "";

                List<String> lines = new ArrayList<>();
                lines.add(prefix);
                lines.add("");
                lines.add("Alert: " + alertname);
                lines.add("Service: " + service);
                lines.add("Environment: " + props.getEnvironment());
                if (!summary.isBlank() && !summary.equals(alertname)) lines.add("\n" + summary);
                if (!description.isBlank()) lines.add(description);
                if (!resolved) lines.add("\nStarted: " + starts);
                else lines.add("\nRecovered to normal.");
                if (!props.getGrafanaUrl().isBlank()) lines.add("\nGrafana: " + props.getGrafanaUrl());

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
}
