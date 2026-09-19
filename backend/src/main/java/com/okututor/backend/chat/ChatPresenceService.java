package com.okututor.backend.chat;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

@Service
public class ChatPresenceService {

    private final ConcurrentHashMap<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public void add(UUID userId, WebSocketSession session) {
        sessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
    }

    public void remove(UUID userId, WebSocketSession session) {
        sessions.computeIfPresent(userId, (k, set) -> {
            set.remove(session);
            return set.isEmpty() ? null : set;
        });
    }

    public boolean isOnline(UUID userId) {
        Set<WebSocketSession> set = sessions.get(userId);
        return set != null && !set.isEmpty();
    }

    public Set<WebSocketSession> getSessions(UUID userId) {
        Set<WebSocketSession> set = sessions.get(userId);
        return set == null ? Set.of() : Set.copyOf(set);
    }

    public Set<UUID> onlineUsers() {
        return Set.copyOf(sessions.keySet());
    }

    public Map<UUID, Set<WebSocketSession>> allSessions() {
        return Map.copyOf(sessions);
    }
}
