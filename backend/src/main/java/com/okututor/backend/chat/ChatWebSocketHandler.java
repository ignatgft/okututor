package com.okututor.backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.okututor.backend.security.JwtService;
import io.jsonwebtoken.Claims;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final ChatPresenceService presence;
    private final ChatService chatService;
    private final ChatParticipantRepository participantRepository;
    private final com.okututor.backend.user.UserRepository userRepository;

    private final ConcurrentHashMap<String, UUID> sessionUser = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(JwtService jwtService, ObjectMapper objectMapper,
                                ChatPresenceService presence, ChatService chatService,
                                ChatParticipantRepository participantRepository,
                                com.okututor.backend.user.UserRepository userRepository) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.presence = presence;
        this.chatService = chatService;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    private boolean isAdmin(UUID userId) {
        try {
            var u = userRepository.findById(userId).orElse(null);
            if (u == null) return false;
            String r = String.valueOf(u.getRole());
            return "ADMIN".equals(r) || "SUPER_ADMIN".equals(r);
        } catch (Exception e) { return false; }
    }

    private UUID resolveUserId(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri != null && uri.getQuery() != null) {
                for (String p : uri.getQuery().split("&")) {
                    String[] kv = p.split("=",2);
                    if (kv.length==2 && (kv[0].equals("token") || kv[0].equals("access_token"))) {
                        String token = java.net.URLDecoder.decode(kv[1], java.nio.charset.StandardCharsets.UTF_8);
                        Claims claims = jwtService.parse(token);
                        return UUID.fromString(claims.getSubject());
                    }
                }
            }
            List<String> auth = session.getHandshakeHeaders().get("Authorization");
            if (auth != null) {
                for (String h : auth) {
                    if (h.startsWith("Bearer ")) {
                        String token = h.substring(7);
                        Claims claims = jwtService.parse(token);
                        return UUID.fromString(claims.getSubject());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("WS auth failed {}", e.getMessage());
        }
        return null;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        UUID userId = resolveUserId(session);
        if (userId == null) {
            log.warn("WS reject no auth {}", session.getId());
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Unauthorized"));
            return;
        }
        session.getAttributes().put("userId", userId);
        sessionUser.put(session.getId(), userId);
        presence.add(userId, session);
        log.info("WS connected user={} session={}", userId, session.getId());
        // send presence online to user's conversations participants? broadcast to all for now
        broadcastPresence(userId, true);
        // send back ack with online list
        try {
            Map<String,Object> ack = Map.of("type","connected","userId",userId.toString(),"online", presence.onlineUsers().stream().map(UUID::toString).toList());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(ack)));
        } catch (Exception ignored) {}
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID userId = sessionUser.remove(session.getId());
        if (userId == null) {
            Object attr = session.getAttributes().get("userId");
            if (attr instanceof UUID u) userId = u;
        }
        if (userId != null) {
            presence.remove(userId, session);
            log.info("WS disconnected user={} session={}", userId, session.getId());
            if (!presence.isOnline(userId)) {
                broadcastPresence(userId, false);
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        UUID senderId = (UUID) session.getAttributes().get("userId");
        if (senderId == null) senderId = sessionUser.get(session.getId());
        if (senderId == null) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Unauthorized"))));
            return;
        }
        String payload = message.getPayload();
        JsonNode node;
        try { node = objectMapper.readTree(payload); } catch (Exception e) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Invalid JSON"))));
            return;
        }
        String type = node.path("type").asText("");
        if ("ping".equals(type)) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","pong"))));
            return;
        }
        if ("typing".equals(type)) {
            String convIdStr = node.path("conversationId").asText(node.path("conversation_id").asText(""));
            boolean isTyping = node.path("isTyping").asBoolean(node.path("typing").asBoolean(false));
            UUID convId = tryUuid(convIdStr);
            if (convId != null) {
                broadcastToConversation(convId, Map.of("type","typing","conversationId",convId.toString(),"userId",senderId.toString(),"isTyping",isTyping), senderId);
            }
            return;
        }
        if ("message".equals(type) || "chat_message".equals(type)) {
            String convIdStr = node.path("conversationId").asText(node.path("conversation_id").asText(""));
            String body = node.path("body").asText(node.path("text").asText(""));
            UUID convId = tryUuid(convIdStr);
            if (convId == null || body == null || body.isBlank()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","conversationId and body required"))));
                return;
            }
            if (body.length() > 2000) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Message too long (max 2000)"))));
                return;
            }
            body = org.jsoup.Jsoup.clean(body, "", org.jsoup.safety.Safelist.none(), new org.jsoup.nodes.Document.OutputSettings().prettyPrint(false)).trim();
            if (body.isBlank()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Empty message"))));
                return;
            }
            // verify participant
            try {
                if (!participantRepository.isParticipant(convId, senderId)) {
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Not participant"))));
                    return;
                }
            } catch (Exception e) {
                log.warn("WS participant check failed {} {}", convId, senderId, e);
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Service unavailable"))));
                return;
            }
            try {
                // persist via service (will also check blocked etc.)
                // ChatService.sendMessage expects UUID conversationId and senderId + text
                var saved = chatService.sendMessage(convId, senderId, body.trim());
                // saved is ChatMessage entity or DTO? service returns void? Check ChatService: sendMessage returns ChatMessage entity? Actually ChatService.sendMessage returns ChatMessage entity? Let's assume it returns ChatMessage
                // We'll broadcast the saved message data
                Map<String,Object> out = new ConcurrentHashMap<>();
                out.put("type","message");
                out.put("conversationId", convId.toString());
                // try to extract fields from saved via objectMapper convert
                try {
                    @SuppressWarnings("unchecked")
                    Map<String,Object> mapped = objectMapper.convertValue(saved, Map.class);
                    // normalize keys to snake/camel for frontend
                    Map<String,Object> msg = new ConcurrentHashMap<>();
                    msg.put("id", mapped.getOrDefault("id",""));
                    msg.put("conversation_id", convId.toString());
                    msg.put("conversationId", convId.toString());
                    msg.put("sender_id", senderId.toString());
                    msg.put("senderId", senderId.toString());
                    msg.put("body", mapped.getOrDefault("body", body));
                    msg.put("text", mapped.getOrDefault("body", body));
                    msg.put("created_at", mapped.getOrDefault("createdAt", mapped.getOrDefault("created_at","")));
                    msg.put("createdAt", mapped.getOrDefault("createdAt", mapped.getOrDefault("created_at","")));
                    out.put("message", msg);
                    out.putAll(msg);
                } catch (Exception ex) {
                    out.put("body", body);
                    out.put("senderId", senderId.toString());
                    out.put("id", UUID.randomUUID().toString());
                }
                broadcastToConversation(convId, out, null);
            } catch (Exception e) {
                log.warn("WS send failed {} {}", convId, e.getMessage());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message", e.getMessage()!=null?e.getMessage():"Failed to send"))));
            }
            return;
        }
        if ("read".equals(type)) {
            String convIdStr = node.path("conversationId").asText("");
            UUID convId = tryUuid(convIdStr);
            if (convId != null) {
                try { chatService.markRead(convId, senderId); } catch (Exception ignored) {}
                broadcastToConversation(convId, Map.of("type","read","conversationId",convId.toString(),"userId",senderId.toString()), senderId);
            }
            return;
        }
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type","error","message","Unknown type "+type))));
    }

    private void broadcastToConversation(UUID conversationId, Map<String,Object> payload, UUID excludeUserId) {
        try {
            List<UUID> userIds = participantRepository.findUserIdsByConversationId(conversationId);
            String json = objectMapper.writeValueAsString(payload);
            TextMessage msg = new TextMessage(json);
            for (UUID uid : userIds) {
                if (excludeUserId != null && uid.equals(excludeUserId)) continue;
                for (WebSocketSession s : presence.getSessions(uid)) {
                    if (s.isOpen()) {
                        try { s.sendMessage(msg); } catch (Exception e) { log.debug("WS send to {} failed {}", uid, e.getMessage()); }
                    }
                }
            }
            // also broadcast to online admins (moderators may not be participants)
            for (UUID adminId : presence.onlineUsers()) {
                if (userIds.contains(adminId)) continue;
                if (excludeUserId != null && adminId.equals(excludeUserId)) continue;
                if (!isAdmin(adminId)) continue;
                for (WebSocketSession s : presence.getSessions(adminId)) {
                    if (s.isOpen()) {
                        try { s.sendMessage(msg); } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception e) {
            log.warn("WS broadcast failed {}", e.getMessage());
        }
    }

    private void broadcastPresence(UUID userId, boolean online) {
        try {
            Map<String,Object> payload = Map.of("type","presence","userId",userId.toString(),"status", online?"online":"offline");
            String json = objectMapper.writeValueAsString(payload);
            TextMessage msg = new TextMessage(json);
            // broadcast to all online sessions
            for (UUID uid : presence.onlineUsers()) {
                for (WebSocketSession s : presence.getSessions(uid)) {
                    if (s.isOpen()) {
                        try { s.sendMessage(msg); } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private static UUID tryUuid(String s) {
        if (s==null || s.isBlank()) return null;
        try { return UUID.fromString(s.trim()); } catch (Exception e) { return null; }
    }
}
