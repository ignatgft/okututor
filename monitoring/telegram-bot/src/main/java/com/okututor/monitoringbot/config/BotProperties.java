package com.okututor.monitoringbot.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class BotProperties {

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.bot.username:okututor_monitoring_bot}")
    private String botUsername;

    @Value("${telegram.chat.id:}")
    private String chatId;

    @Value("${telegram.allowed.chat.ids:}")
    private String allowedChatIds;

    @Value("${telegram.environment:production}")
    private String environment;

    @Value("${alertmanager.url:http://alertmanager:9093}")
    private String alertmanagerUrl;

    @Value("${grafana.url:http://grafana:3000}")
    private String grafanaUrl;

    public String getBotToken() { return botToken == null ? "" : botToken.trim(); }
    public String getBotUsername() { return botUsername == null ? "okututor_monitoring_bot" : botUsername.trim(); }
    public String getChatId() { return chatId == null ? "" : chatId.trim(); }
    public String getEnvironment() { return environment; }
    public String getAlertmanagerUrl() { return alertmanagerUrl; }
    public String getGrafanaUrl() { return grafanaUrl == null ? "" : grafanaUrl.trim(); }

    public Set<String> getAllowedSet() {
        String raw = allowedChatIds != null && !allowedChatIds.isBlank() ? allowedChatIds : chatId;
        if (raw == null || raw.isBlank()) return Collections.emptySet();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    public boolean isAllowed(String chatIdStr) {
        Set<String> allowed = getAllowedSet();
        if (allowed.isEmpty()) return true;
        return allowed.contains(chatIdStr);
    }

    public String getPrimaryRecipient() {
        if (chatId != null && !chatId.isBlank()) return chatId.trim();
        Set<String> s = getAllowedSet();
        return s.isEmpty() ? "" : s.iterator().next();
    }
}
