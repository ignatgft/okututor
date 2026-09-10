package com.okututor.backend.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.request.TutorRequest;
import com.okututor.backend.request.TutorRequestRepository;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class ChatIntegrationTest {

    @Container
    @ServiceConnection
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine").withReuse(false);

    @Autowired UserRepository userRepository;
    @Autowired TutorProfileRepository profileRepository;
    @Autowired TutorRequestRepository requestRepository;
    @Autowired ChatConversationRepository conversationRepository;
    @Autowired ChatParticipantRepository participantRepository;
    @Autowired ChatMessageRepository messageRepository;
    @Autowired ChatService chatService;

    private User tutor;
    private User student;
    private User stranger;
    private TutorRequest request;

    @BeforeEach
    void setUp() {
        // clean
        messageRepository.deleteAll();
        participantRepository.deleteAll();
        conversationRepository.deleteAll();
        requestRepository.deleteAll();
        profileRepository.deleteAll();
        // do not delete users to avoid FK issues, just create new ones
    }

    private User persisted(String email, Role role) {
        User u = new User();
        u.setEmail(email + "-" + UUID.randomUUID() + "@test.com");
        u.setRole(role);
        u.setVerified(true);
        return userRepository.save(u);
    }

    private TutorRequest createRequest(User tutor, User student) {
        TutorProfile profile = new TutorProfile();
        profile.setUser(tutor);
        profile.setFirstName("Tutor");
        profile.setLastName("Test");
        profile.setSlug("tutor-" + UUID.randomUUID().toString().substring(0, 8));
        profile.setStatus(com.okututor.backend.tutor.TutorProfileStatus.PUBLISHED);
        profile.setTutorType(com.okututor.backend.tutor.TutorType.TEACHER);
        profileRepository.save(profile);

        TutorRequest req = new TutorRequest();
        req.setTutorProfile(profile);
        req.setTutorUser(tutor);
        req.setStudentUser(student);
        req.setStudentName("Student");
        req.setStudentContact("+996700000000");
        req.setMessage("hello");
        return requestRepository.save(req);
    }

    @Test
    @Transactional
    void requestCreatesConversationAndBothCanCommunicate() {
        tutor = persisted("tutor-chat", Role.TUTOR);
        student = persisted("student-chat", Role.STUDENT);
        request = createRequest(tutor, student);

        var conv = chatService.createOrGetConversation(request.getId(), tutor.getId());
        assertThat(conv.id()).isNotNull();
        assertThat(conv.requestId()).isEqualTo(request.getId());

        // repeated create returns same
        var conv2 = chatService.createOrGetConversation(request.getId(), student.getId());
        assertThat(conv2.id()).isEqualTo(conv.id());

        // both participants can send
        var msg1 = chatService.sendMessage(conv.id(), tutor.getId(), "Hello student");
        assertThat(msg1.body()).isEqualTo("Hello student");
        assertThat(msg1.senderId()).isEqualTo(tutor.getId());

        var msg2 = chatService.sendMessage(conv.id(), student.getId(), "Hello tutor");
        assertThat(msg2.body()).isEqualTo("Hello tutor");

        // message saved correctly
        var page = chatService.listMessages(conv.id(), tutor.getId(), 0, 10);
        assertThat(page.getTotalElements()).isEqualTo(2);
        // unread count for tutor should be 1 (student's message unread)
        long unreadTutor = chatService.unreadCount(tutor.getId());
        assertThat(unreadTutor).isEqualTo(1);
        long unreadStudent = chatService.unreadCount(student.getId());
        assertThat(unreadStudent).isEqualTo(1);

        // mark read
        int updated = chatService.markRead(conv.id(), tutor.getId());
        assertThat(updated).isEqualTo(1);
        assertThat(chatService.unreadCount(tutor.getId())).isEqualTo(0);
    }

    @Test
    @Transactional
    void duplicateConversationProhibitedByConstraint() {
        tutor = persisted("tutor-dup", Role.TUTOR);
        student = persisted("student-dup", Role.STUDENT);
        request = createRequest(tutor, student);

        var conv1 = chatService.createOrGetConversation(request.getId(), tutor.getId());
        assertThat(conv1.id()).isNotNull();

        // Try to insert duplicate conversation directly via repo (should violate unique request_id)
        ChatConversation dup = new ChatConversation();
        dup.setRequest(request);
        assertThatThrownBy(() -> {
            conversationRepository.saveAndFlush(dup);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    void duplicateParticipantProhibited() {
        tutor = persisted("tutor-part", Role.TUTOR);
        student = persisted("student-part", Role.STUDENT);
        request = createRequest(tutor, student);

        var conv = chatService.createOrGetConversation(request.getId(), tutor.getId());
        // try duplicate participant
        ChatParticipant dup = new ChatParticipant();
        dup.setConversation(conversationRepository.findById(conv.id()).orElseThrow());
        dup.setUser(tutor);
        assertThatThrownBy(() -> {
            participantRepository.saveAndFlush(dup);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    void paginationWorks() {
        tutor = persisted("tutor-page", Role.TUTOR);
        student = persisted("student-page", Role.STUDENT);
        request = createRequest(tutor, student);
        var conv = chatService.createOrGetConversation(request.getId(), tutor.getId());
        for (int i = 0; i < 25; i++) {
            chatService.sendMessage(conv.id(), tutor.getId(), "msg " + i);
        }
        var page0 = chatService.listMessages(conv.id(), tutor.getId(), 0, 10);
        var page1 = chatService.listMessages(conv.id(), tutor.getId(), 1, 10);
        var page2 = chatService.listMessages(conv.id(), tutor.getId(), 2, 10);
        assertThat(page0.getContent()).hasSize(10);
        assertThat(page1.getContent()).hasSize(10);
        assertThat(page2.getContent()).hasSize(5);
        assertThat(page0.getTotalElements()).isEqualTo(25);
    }

    @Test
    @Transactional
    void nonParticipantCannotReadOrSend() {
        tutor = persisted("tutor-sec", Role.TUTOR);
        student = persisted("student-sec", Role.STUDENT);
        stranger = persisted("stranger-sec", Role.STUDENT);
        request = createRequest(tutor, student);
        var conv = chatService.createOrGetConversation(request.getId(), tutor.getId());

        assertThatThrownBy(() -> chatService.getConversation(conv.id(), stranger.getId()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");

        assertThatThrownBy(() -> chatService.sendMessage(conv.id(), stranger.getId(), "hi"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");

        assertThatThrownBy(() -> chatService.listMessages(conv.id(), stranger.getId(), 0, 10))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");

        assertThatThrownBy(() -> chatService.markRead(conv.id(), stranger.getId()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("FORBIDDEN");
    }
}
