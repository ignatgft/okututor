package com.okututor.backend.chat;

import com.okututor.backend.chat.dto.ChatConversationResponse;
import com.okututor.backend.chat.dto.ChatMessageResponse;
import com.okututor.backend.chat.dto.CreateMessageRequest;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ChatController {

    private final ChatService chatService;
    private final com.okututor.backend.common.ratelimit.RateLimitService rateLimitService;

    public ChatController(ChatService chatService,
                          com.okututor.backend.common.ratelimit.RateLimitService rateLimitService) {
        this.chatService = chatService;
        this.rateLimitService = rateLimitService;
    }

    // POST /api/v1/conversations/direct — main CTA "Связаться" (idempotent)
    @PostMapping("/conversations/direct")
    public Map<String, Object> createDirect(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        rateLimitService.checkMessageSend(principal.id().toString());
        String participantId = body != null ? body.get("participantId") : null;
        if (participantId == null && body != null) participantId = body.get("tutorId");
        if (participantId == null && body != null) participantId = body.get("tutor_id");
        if (participantId == null || participantId.isBlank()) {
            throw ApiException.validation("participantId is required");
        }
        UUID pid;
        try {
            pid = UUID.fromString(participantId.trim());
        } catch (IllegalArgumentException e) {
            throw ApiException.validation("Invalid participantId");
        }
        return chatService.createOrGetDirect(principal.id(), pid);
    }

    // POST /api/v1/requests/{requestId}/conversation  (alias for /tutor-requests)
    @PostMapping({"/requests/{requestId}/conversation", "/tutor-requests/{requestId}/conversation"})
    public ChatConversationResponse createOrGetConversation(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return chatService.createOrGetConversation(requestId, principal.id());
    }

    // GET /api/v1/conversations
    @GetMapping("/conversations")
    public Page<ChatConversationResponse> myConversations(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requireAuth(principal);
        return chatService.listConversations(principal.id(), page, size);
    }

    // GET /api/v1/conversations/unread-count  (must be before /{id})
    @GetMapping("/conversations/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        long count = chatService.unreadCount(principal.id());
        return Map.of("count", count);
    }

    // GET /api/v1/conversations/{conversationId}
    @GetMapping("/conversations/{conversationId}")
    public ChatConversationResponse getConversation(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return chatService.getConversation(conversationId, principal.id());
    }

    // GET /api/v1/conversations/{conversationId}/messages
    @GetMapping("/conversations/{conversationId}/messages")
    public Page<ChatMessageResponse> listMessages(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requireAuth(principal);
        return chatService.listMessages(conversationId, principal.id(), page, size);
    }

    // POST /api/v1/conversations/{conversationId}/messages
    @PostMapping("/conversations/{conversationId}/messages")
    public ChatMessageResponse sendMessage(
            @PathVariable UUID conversationId,
            @Valid @RequestBody CreateMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        rateLimitService.checkMessageSend(principal.id().toString());
        String text = request.text();
        if (text == null || text.trim().isEmpty()) {
            throw ApiException.validation("text is required");
        }
        // sender is authenticated principal, not from request (IDOR prevention)
        return chatService.sendMessage(conversationId, principal.id(), text.trim());
    }

    // POST /api/v1/conversations/{conversationId}/read
    @PostMapping("/conversations/{conversationId}/read")
    public Map<String, Object> markRead(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        int updated = chatService.markRead(conversationId, principal.id());
        return Map.of("updated", updated, "conversationId", conversationId.toString());
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
    }
}
