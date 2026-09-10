package com.okututor.backend.chat;

import com.okututor.backend.chat.dto.ChatConversationResponse;
import com.okututor.backend.chat.dto.ChatMessageResponse;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.notification.NotificationService;
import com.okututor.backend.request.TutorRequest;
import com.okututor.backend.request.TutorRequestRepository;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final int MAX_MESSAGE_LENGTH = 2000;

    private final ChatConversationRepository conversationRepository;
    private final ChatParticipantRepository participantRepository;
    private final ChatMessageRepository messageRepository;
    private final TutorRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final NotificationService notificationService;

    public ChatService(ChatConversationRepository conversationRepository,
                       ChatParticipantRepository participantRepository,
                       ChatMessageRepository messageRepository,
                       TutorRequestRepository requestRepository,
                       UserRepository userRepository,
                       TutorProfileRepository tutorProfileRepository,
                       NotificationService notificationService) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.tutorProfileRepository = tutorProfileRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public ChatConversationResponse createOrGetConversation(UUID requestId, UUID currentUserId) {
        TutorRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("TutorRequest not found"));
        // blocked actor cannot create conversation
        User current = userRepository.findById(currentUserId).orElse(null);
        if (current != null && current.isBlocked()) {
            throw ApiException.forbidden("Blocked users cannot access chat");
        }

        // check that current user is participant of request (tutor or student)
        UUID tutorId = request.getTutorUser() != null ? request.getTutorUser().getId() : null;
        UUID studentId = request.getStudentUser() != null ? request.getStudentUser().getId() : null;

        boolean isTutor = tutorId != null && tutorId.equals(currentUserId);
        boolean isStudent = studentId != null && studentId.equals(currentUserId);

        // If request is anonymous (studentUser null), we allow currentUser to become student participant
        // But for frozen baseline, we require studentUser not null for chat; otherwise 403
        if (!isTutor && !isStudent) {
            // If student is null and currentUser is not tutor, we could allow to claim as student?
            // For safety, forbid anonymous requests from creating chat unless they are authenticated and we set student
            // Check if request has no studentUser and currentUser != tutor -> we allow to bind?
            // But spec says participants determined automatically from TutorRequest, so we should not auto-bind anonymous.
            // For MVP, require both participants exist; otherwise 403
            if (studentId == null && !isTutor) {
                throw ApiException.forbidden("Not a participant of this request");
            }
            if (studentId != null) {
                throw ApiException.forbidden("Not a participant of this request");
            }
        }

        // try find existing conversation
        var existingOpt = conversationRepository.findByRequestId(requestId);
        if (existingOpt.isPresent()) {
            ChatConversation conv = existingOpt.get();
            // ensure current user is participant
            if (!participantRepository.isParticipant(conv.getId(), currentUserId)) {
                throw ApiException.forbidden("Not a participant of this conversation");
            }
            return toConversationResponse(conv, currentUserId);
        }

        // create new conversation
        // Determine participants: tutorUser and studentUser must both exist
        if (tutorId == null || studentId == null) {
            throw ApiException.validation("Cannot create conversation for request without both participants");
        }

        User tutorUser = request.getTutorUser();
        User studentUser = request.getStudentUser();

        // prevent duplicate via constraint: try create, catch duplicate
        ChatConversation conv = new ChatConversation();
        conv.setRequest(request);
        conv.setStatus(ChatConversation.Status.ACTIVE);
        try {
            conversationRepository.saveAndFlush(conv);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // duplicate request_id -> return existing
            var existing = conversationRepository.findByRequestId(requestId)
                    .orElseThrow(() -> ApiException.conflict("Conversation already exists"));
            if (!participantRepository.isParticipant(existing.getId(), currentUserId)) {
                throw ApiException.forbidden("Not a participant of this conversation");
            }
            return toConversationResponse(existing, currentUserId);
        }

        // create participants
        ChatParticipant p1 = new ChatParticipant();
        p1.setConversation(conv);
        p1.setUser(tutorUser);
        participantRepository.save(p1);

        // avoid duplicate if tutor == student (should not happen due to validation in TutorRequestService)
        if (!tutorId.equals(studentId)) {
            ChatParticipant p2 = new ChatParticipant();
            p2.setConversation(conv);
            p2.setUser(studentUser);
            participantRepository.save(p2);
        }

        log.info("CHAT conversation created requestId={} conversationId={} by userId={}", requestId, conv.getId(), currentUserId);
        return toConversationResponse(conv, currentUserId);
    }

    @Transactional
    public Map<String, Object> createOrGetDirect(UUID currentUserId, UUID participantId) {
        if (currentUserId.equals(participantId)) {
            throw ApiException.validation("Cannot create conversation with yourself");
        }
        User current = userRepository.findById(currentUserId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (current.isBlocked()) {
            throw ApiException.forbidden("Blocked users cannot create conversations");
        }
        // resolve target user and tutor profile (participantId may be userId or profileId)
        User target = userRepository.findById(participantId).orElse(null);
        TutorProfile tutorProfile = null;
        if (target != null) {
            tutorProfile = tutorProfileRepository.findByUserId(target.getId()).orElse(null);
            if (tutorProfile == null) {
                // maybe participantId was profileId, try that
                tutorProfile = tutorProfileRepository.findById(participantId).orElse(null);
                if (tutorProfile != null) target = tutorProfile.getUser();
            }
        } else {
            tutorProfile = tutorProfileRepository.findById(participantId).orElse(null);
            if (tutorProfile != null) target = tutorProfile.getUser();
        }
        if (target == null || tutorProfile == null) {
            throw ApiException.notFound("Tutor not found");
        }
        if (target.isBlocked()) {
            throw ApiException.notFound("Tutor not found");
        }
        if (tutorProfile.getStatus() != com.okututor.backend.tutor.TutorProfileStatus.PUBLISHED) {
            throw ApiException.notFound("Tutor not found");
        }
        // find existing active request between current (student) and tutor
        TutorRequest existingRequest = null;
        var page = requestRepository.findByTutorProfileIdOrderByCreatedAtDesc(tutorProfile.getId(), org.springframework.data.domain.PageRequest.of(0, 5));
        for (TutorRequest r : page.getContent()) {
            if (r.getStudentUser() != null && r.getStudentUser().getId().equals(currentUserId)
                    && r.getTutorUser().getId().equals(target.getId())
                    && (r.getStatus() == TutorRequest.Status.NEW || r.getStatus() == TutorRequest.Status.VIEWED || r.getStatus() == TutorRequest.Status.CONTACTED)) {
                existingRequest = r;
                break;
            }
        }
        boolean requestCreated = false;
        if (existingRequest == null) {
            TutorRequest r = new TutorRequest();
            r.setTutorProfile(tutorProfile);
            r.setTutorUser(target);
            r.setStudentUser(current);
            r.setStudentName(current.getFullName() != null ? current.getFullName() : current.getEmail());
            r.setStudentContact(current.getPhone() != null ? current.getPhone() : current.getEmail());
            r.setMessage("Здравствуйте! Хочу обсудить занятия.");
            r.setStatus(TutorRequest.Status.NEW);
            try {
                requestRepository.saveAndFlush(r);
                existingRequest = r;
                requestCreated = true;
            } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                // concurrent duplicate (uq_tutor_request_active) — fetch existing
                var retryPage = requestRepository.findByTutorProfileIdOrderByCreatedAtDesc(tutorProfile.getId(), org.springframework.data.domain.PageRequest.of(0, 5));
                for (TutorRequest rr : retryPage.getContent()) {
                    if (rr.getStudentUser() != null && rr.getStudentUser().getId().equals(currentUserId)
                            && rr.getTutorUser().getId().equals(target.getId())
                            && (rr.getStatus() == TutorRequest.Status.NEW || rr.getStatus() == TutorRequest.Status.VIEWED || rr.getStatus() == TutorRequest.Status.CONTACTED)) {
                        existingRequest = rr;
                        break;
                    }
                }
                if (existingRequest == null) throw ex;
            }
        }
        // check if conversation already exists for this request
        var existingConv = conversationRepository.findByRequestId(existingRequest.getId());
        boolean alreadyExisted = existingConv.isPresent();
        ChatConversationResponse conv = createOrGetConversation(existingRequest.getId(), currentUserId);
        User participantUser = target;
        return Map.of(
                "id", conv.id().toString(),
                "requestId", conv.requestId().toString(),
                "type", "DIRECT",
                "participant", Map.of(
                        "id", participantUser.getId().toString(),
                        "name", participantUser.getFullName() != null ? participantUser.getFullName() : participantUser.getEmail(),
                        "avatarUrl", participantUser.getAvatarUrl() != null ? participantUser.getAvatarUrl() : ""
                ),
                "created", !alreadyExisted,
                "requestCreated", requestCreated
        );
    }

    @Transactional(readOnly = true)
    public Page<ChatConversationResponse> listConversations(UUID currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<ChatConversation> convPage = conversationRepository.findByParticipantUserId(currentUserId, pageable);
        if (convPage.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        List<UUID> ids = convPage.getContent().stream().map(ChatConversation::getId).toList();

        // batch unread counts
        Map<UUID, Long> unreadMap = messageRepository.countUnreadGrouped(ids, currentUserId).stream()
                .collect(Collectors.toMap(
                        arr -> (UUID) arr[0],
                        arr -> (Long) arr[1]
                ));

        // batch participants for other participant info
        List<ChatParticipant> allParticipants = participantRepository.findByConversationIdIn(ids);
        Map<UUID, List<ChatParticipant>> byConv = allParticipants.stream()
                .collect(Collectors.groupingBy(p -> p.getConversation().getId()));

        List<ChatConversationResponse> content = new ArrayList<>();
        for (ChatConversation conv : convPage.getContent()) {
            List<ChatParticipant> parts = byConv.getOrDefault(conv.getId(), List.of());
            ChatParticipant other = parts.stream().filter(p -> !p.getUser().getId().equals(currentUserId)).findFirst().orElse(null);
            UUID otherId = other != null ? other.getUser().getId() : null;
            String otherName = null;
            if (other != null && other.getUser() != null) {
                try {
                    otherName = other.getUser().getFullName();
                } catch (Exception ignored) {
                    otherName = other.getUser().getEmail();
                }
            }
            long unread = unreadMap.getOrDefault(conv.getId(), 0L);
            content.add(new ChatConversationResponse(
                    conv.getId(),
                    conv.getRequest().getId(),
                    conv.getStatus().name(),
                    conv.getCreatedAt(),
                    conv.getUpdatedAt(),
                    conv.getLastMessageAt(),
                    conv.getLastMessage(),
                    unread,
                    otherId,
                    otherName
            ));
        }

        return new PageImpl<>(content, pageable, convPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ChatConversationResponse getConversation(UUID conversationId, UUID currentUserId) {
        ChatConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));
        if (!participantRepository.isParticipant(conversationId, currentUserId)) {
            throw ApiException.forbidden("Not a participant of this conversation");
        }
        return toConversationResponse(conv, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> listMessages(UUID conversationId, UUID currentUserId, int page, int size) {
        if (!participantRepository.isParticipant(conversationId, currentUserId)) {
            throw ApiException.forbidden("Not a participant of this conversation");
        }
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ChatMessage> msgPage = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
        // Map to DTO, need sender name; we can batch fetch sender names via userRepository? But we can use sender.getFullName() within transaction (lazy)
        List<ChatMessageResponse> content = msgPage.getContent().stream()
                .map(m -> new ChatMessageResponse(
                        m.getId(),
                        m.getConversation().getId(),
                        m.getSender().getId(),
                        safeName(m.getSender()),
                        m.getBody(),
                        m.getCreatedAt(),
                        m.getReadAt()
                ))
                .toList();
        return new PageImpl<>(content, pageable, msgPage.getTotalElements());
    }

    @Transactional
    public ChatMessageResponse sendMessage(UUID conversationId, UUID senderId, String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            throw ApiException.validation("text is required");
        }
        String text = rawText.trim();
        if (text.length() > MAX_MESSAGE_LENGTH) {
            throw ApiException.validation("text must be <= " + MAX_MESSAGE_LENGTH + " characters");
        }

        ChatConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));

        if (!participantRepository.isParticipant(conversationId, senderId)) {
            throw ApiException.forbidden("Not a participant of this conversation");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (sender.isBlocked()) {
            throw ApiException.forbidden("Blocked users cannot send messages");
        }

        ChatMessage msg = new ChatMessage();
        msg.setConversation(conv);
        msg.setSender(sender);
        msg.setBody(text);
        messageRepository.save(msg);

        // update conversation last message and updatedAt
        conv.setLastMessage(truncate(text, 500));
        conv.setLastMessageAt(msg.getCreatedAt());
        // updatedAt will be set via @PreUpdate, but we force
        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);

        // notify other participant (best-effort)
        try {
            List<ChatParticipant> others = participantRepository.findOtherParticipants(conversationId, senderId);
            for (ChatParticipant other : others) {
                UUID otherId = other.getUser().getId();
                String senderName = safeName(sender);
                String preview = truncate(text, 100);
                notificationService.notify(
                        otherId,
                        "New message from " + senderName + ": " + preview,
                        "CHAT_MESSAGE",
                        "/conversations/" + conversationId,
                        Map.of("conversation_id", conversationId.toString(), "message_id", msg.getId().toString(), "request_id", conv.getRequest().getId().toString()),
                        "CONVERSATION",
                        conversationId.toString()
                );
            }
        } catch (Exception ex) {
            log.warn("Failed to send chat notification conversationId={} senderId={}", conversationId, senderId, ex);
        }

        log.info("CHAT message sent conversationId={} senderId={} messageId={}", conversationId, senderId, msg.getId());
        return new ChatMessageResponse(msg.getId(), conv.getId(), sender.getId(), safeName(sender), msg.getBody(), msg.getCreatedAt(), msg.getReadAt());
    }

    @Transactional
    public int markRead(UUID conversationId, UUID currentUserId) {
        if (!participantRepository.isParticipant(conversationId, currentUserId)) {
            throw ApiException.forbidden("Not a participant of this conversation");
        }
        return messageRepository.markReadForConversation(conversationId, currentUserId, Instant.now());
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID currentUserId) {
        List<UUID> conversationIds = participantRepository.findConversationIdsByUserId(currentUserId);
        if (conversationIds.isEmpty()) return 0;
        return messageRepository.countUnreadTotal(conversationIds, currentUserId);
    }

    // internal helper to map conversation to response with unread/last
    private ChatConversationResponse toConversationResponse(ChatConversation conv, UUID currentUserId) {
        long unread = 0;
        try {
            unread = messageRepository.countUnreadForConversation(conv.getId(), currentUserId);
        } catch (Exception ignored) {}
        // find other participant
        UUID otherId = null;
        String otherName = null;
        try {
            List<ChatParticipant> others = participantRepository.findOtherParticipants(conv.getId(), currentUserId);
            if (!others.isEmpty()) {
                User other = others.get(0).getUser();
                otherId = other.getId();
                otherName = safeName(other);
            }
        } catch (Exception ignored) {}
        return new ChatConversationResponse(
                conv.getId(),
                conv.getRequest().getId(),
                conv.getStatus().name(),
                conv.getCreatedAt(),
                conv.getUpdatedAt(),
                conv.getLastMessageAt(),
                conv.getLastMessage(),
                unread,
                otherId,
                otherName
        );
    }

    private String safeName(User user) {
        if (user == null) return "Unknown";
        try {
            String full = user.getFullName();
            if (full != null && !full.isBlank()) return full;
        } catch (Exception ignored) {}
        return user.getEmail() != null ? user.getEmail() : user.getId().toString();
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        if (s.length() <= max) return s;
        return s.substring(0, max);
    }
}
