package com.okututor.backend.chat;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class ChatWebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler handler;
    private final com.okututor.backend.common.config.AppProperties appProperties;

    public ChatWebSocketConfig(ChatWebSocketHandler handler, com.okututor.backend.common.config.AppProperties appProperties) {
        this.handler = handler;
        this.appProperties = appProperties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] allowed = appProperties.getCors().getAllowedOrigins().toArray(new String[0]);
        registry.addHandler(handler, "/ws", "/ws/chat")
                .setAllowedOriginPatterns(allowed.length == 0 ? new String[]{"*"} : allowed);
    }
}
