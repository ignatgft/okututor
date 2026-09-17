package com.okututor.backend.monitoring;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "monitoring")
public class MonitoringProperties {

    private Telegram telegram = new Telegram();

    public Telegram getTelegram() { return telegram; }
    public void setTelegram(Telegram telegram) { this.telegram = telegram; }

    public static class Telegram {
        private boolean enabled = false;
        private String chatId = "";
        private String allowedChatIds = "";

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getChatId() { return chatId; }
        public void setChatId(String chatId) { this.chatId = chatId; }
        public String getAllowedChatIds() { return allowedChatIds; }
        public void setAllowedChatIds(String allowedChatIds) { this.allowedChatIds = allowedChatIds; }
    }
}
