package com.okututor.backend.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.okututor.backend.chat.dto.ChatConversationResponse;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.notification.NotificationService;
import com.okututor.backend.request.TutorRequest;
import com.okututor.backend.request.TutorRequestRepository;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ChatServiceTest {

    private ChatConversationRepository conversationRepository;
    private ChatParticipantRepository participantRepository;
    private ChatMessageRepository messageRepository;
    private TutorRequestRepository requestRepository;
    private UserRepository userRepository;
    private com.okututor.backend.tutor.TutorProfileRepository tutorProfileRepository;
    private NotificationService notificationService;
    private ChatService service;

    private User tutor;
    private User student;
    private User stranger;
    private TutorRequest request;

    @BeforeEach
    void setUp() {
        conversationRepository = mock(ChatConversationRepository.class);
        participantRepository = mock(ChatParticipantRepository.class);
        messageRepository = mock(ChatMessageRepository.class);
        requestRepository = mock(TutorRequestRepository.class);
        userRepository = mock(UserRepository.class);
        tutorProfileRepository = mock(com.okututor.backend.tutor.TutorProfileRepository.class);
        notificationService = mock(NotificationService.class);
        service = new ChatService(conversationRepository, participantRepository, messageRepository, requestRepository, userRepository, tutorProfileRepository, notificationService);

        tutor = new User();
        tutor.setId(UUID.randomUUID());
        tutor.setEmail("tutor@test.com");
        student = new User();
        student.setId(UUID.randomUUID());
        student.setEmail("student@test.com");
        stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@test.com");

        TutorProfile profile = new TutorProfile();
        profile.setId(UUID.randomUUID());

        request = new TutorRequest();
        request.setId(UUID.randomUUID());
        request.setTutorProfile(profile);
        request.setTutorUser(tutor);
        request.setStudentUser(student);
        request.setStudentName("Student");
        request.setStudentContact("+996700000000");
    }

    @Test
    void nonParticipantCannotCreateConversation() {
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> service.createOrGetConversation(request.getId(), stranger.getId()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void senderIsDeterminedFromPrincipalNotRequest() {
        // Simulate that service always uses senderId from principal, not from body
        // This test ensures that even if frontend sends senderId, service ignores it
        UUID conversationId = UUID.randomUUID();
        ChatConversation conv = new ChatConversation();
        conv.setId(conversationId);
        conv.setRequest(request);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(participantRepository.isParticipant(conversationId, student.getId())).thenReturn(true);
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(participantRepository.findOtherParticipants(conversationId, student.getId())).thenReturn(java.util.List.of());

        // Try to send as student, even though stranger tries to spoof
        var resp = service.sendMessage(conversationId, student.getId(), "hello");
        assertThat(resp.senderId()).isEqualTo(student.getId());
        assertThat(resp.senderId()).isNotEqualTo(stranger.getId());
    }

    @Test
    void nonParticipantCannotSendMessage() {
        UUID conversationId = UUID.randomUUID();
        ChatConversation conv = new ChatConversation();
        conv.setId(conversationId);
        conv.setRequest(request);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(participantRepository.isParticipant(conversationId, stranger.getId())).thenReturn(false);

        assertThatThrownBy(() -> service.sendMessage(conversationId, stranger.getId(), "hi"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void cannotSendEmptyMessage() {
        UUID conversationId = UUID.randomUUID();
        ChatConversation conv = new ChatConversation();
        conv.setId(conversationId);
        conv.setRequest(request);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(participantRepository.isParticipant(conversationId, student.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.sendMessage(conversationId, student.getId(), "   "))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void messageLengthValidation() {
        UUID conversationId = UUID.randomUUID();
        ChatConversation conv = new ChatConversation();
        conv.setId(conversationId);
        conv.setRequest(request);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(participantRepository.isParticipant(conversationId, student.getId())).thenReturn(true);

        String longText = "a".repeat(2001);
        assertThatThrownBy(() -> service.sendMessage(conversationId, student.getId(), longText))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void nonParticipantCannotReadConversation() {
        UUID conversationId = UUID.randomUUID();
        ChatConversation conv = new ChatConversation();
        conv.setId(conversationId);
        conv.setRequest(request);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(participantRepository.isParticipant(conversationId, stranger.getId())).thenReturn(false);

        assertThatThrownBy(() -> service.getConversation(conversationId, stranger.getId()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");

        assertThatThrownBy(() -> service.listMessages(conversationId, stranger.getId(), 0, 20))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void cannotMarkOtherConversationAsRead() {
        UUID conversationId = UUID.randomUUID();
        when(participantRepository.isParticipant(conversationId, stranger.getId())).thenReturn(false);
        assertThatThrownBy(() -> service.markRead(conversationId, stranger.getId()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void repeatedCreateReturnsSameConversation() {
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        ChatConversation existing = new ChatConversation();
        existing.setId(UUID.randomUUID());
        existing.setRequest(request);
        when(conversationRepository.findByRequestId(request.getId())).thenReturn(Optional.of(existing));
        when(participantRepository.isParticipant(existing.getId(), tutor.getId())).thenReturn(true);
        when(messageRepository.countUnreadForConversation(eq(existing.getId()), eq(tutor.getId()))).thenReturn(0L);
        when(participantRepository.findOtherParticipants(existing.getId(), tutor.getId())).thenReturn(java.util.List.of());

        ChatConversationResponse resp1 = service.createOrGetConversation(request.getId(), tutor.getId());
        ChatConversationResponse resp2 = service.createOrGetConversation(request.getId(), tutor.getId());
        assertThat(resp1.id()).isEqualTo(resp2.id());
        assertThat(resp1.requestId()).isEqualTo(request.getId());
    }
}
