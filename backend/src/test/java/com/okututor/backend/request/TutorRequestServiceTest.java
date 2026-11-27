package com.okututor.backend.request;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.observability.ObservabilityMetrics;
import com.okututor.backend.request.dto.TutorRequestCreateRequest;
import com.okututor.backend.request.dto.TutorRequestResponse;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import java.util.List;

class TutorRequestServiceTest {

    private TutorRequestRepository requestRepository;
    private TutorProfileRepository profileRepository;
    private UserRepository userRepository;
    private ObservabilityMetrics metrics;
    private TutorRequestService service;

    private TutorProfile activeProfile;
    private User tutorUser;
    private UUID tutorUserId;
    private UUID profileId;

    @BeforeEach
    void setUp() {
        requestRepository = mock(TutorRequestRepository.class);
        profileRepository = mock(TutorProfileRepository.class);
        userRepository = mock(UserRepository.class);
        metrics = mock(ObservabilityMetrics.class);
        service = new TutorRequestService(requestRepository, profileRepository, userRepository, metrics);

        tutorUserId = UUID.randomUUID();
        profileId = UUID.randomUUID();

        tutorUser = new User();
        tutorUser.setId(tutorUserId);
        tutorUser.setEmail("tutor@test.kg");
        tutorUser.setBlocked(false);

        activeProfile = new TutorProfile();
        activeProfile.setId(profileId);
        activeProfile.setUser(tutorUser);
        activeProfile.setStatus(TutorProfileStatus.PUBLISHED);
        activeProfile.setExpiresAt(Instant.now().plusSeconds(86400 * 20)); // valid 20 days

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(activeProfile));
        when(requestRepository.save(any(TutorRequest.class))).thenAnswer(inv -> {
            TutorRequest r = inv.getArgument(0);
            if (r.getId() == null) r.setId(UUID.randomUUID());
            return r;
        });
    }

    @Test
    void create_rejectsExpiredTutorProfile() {
        // Expire the profile
        activeProfile.setExpiresAt(Instant.now().minusSeconds(3600));

        TutorRequestCreateRequest req = new TutorRequestCreateRequest(
                profileId, "Student Name", "+996555111222", "I need a lesson"
        );

        assertThatThrownBy(() -> service.create(req, UUID.randomUUID()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Tutor profile not found");
    }

    @Test
    void create_sanitizesHtmlInInputs() {
        UUID studentId = UUID.randomUUID();
        User student = new User();
        student.setId(studentId);
        student.setBlocked(false);
        when(userRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(requestRepository.findByTutorProfileIdOrderByCreatedAtDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of()));

        TutorRequestCreateRequest req = new TutorRequestCreateRequest(
                profileId,
                "Student <script>alert(1)</script>",
                "<b>+996555111222</b>",
                "Hello <img src=x onerror=alert(1)>world!"
        );

        TutorRequestResponse resp = service.create(req, studentId);

        ArgumentCaptor<TutorRequest> captor = ArgumentCaptor.forClass(TutorRequest.class);
        org.mockito.Mockito.verify(requestRepository).save(captor.capture());
        TutorRequest saved = captor.getValue();

        assertThat(saved.getStudentName()).isEqualTo("Student");
        assertThat(saved.getStudentContact()).isEqualTo("+996555111222");
        assertThat(saved.getMessage()).isEqualTo("Hello world!");
    }

    @Test
    void create_preventsSelfRequest() {
        TutorRequestCreateRequest req = new TutorRequestCreateRequest(
                profileId, "Myself", "+996555000000", "Self message"
        );

        assertThatThrownBy(() -> service.create(req, tutorUserId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Cannot contact yourself");
    }

    @Test
    void markViewed_updatesStatusWhenTutorCalls() {
        UUID reqId = UUID.randomUUID();
        TutorRequest tr = new TutorRequest();
        tr.setId(reqId);
        tr.setTutorUser(tutorUser);
        tr.setTutorProfile(activeProfile);
        tr.setStatus(TutorRequest.Status.NEW);

        when(requestRepository.findById(reqId)).thenReturn(Optional.of(tr));

        TutorRequestResponse response = service.markViewed(reqId, tutorUserId);

        assertThat(tr.getStatus()).isEqualTo(TutorRequest.Status.VIEWED);
    }

    @Test
    void markViewed_forbiddenForNonOwner() {
        UUID reqId = UUID.randomUUID();
        TutorRequest tr = new TutorRequest();
        tr.setId(reqId);
        tr.setTutorUser(tutorUser);
        tr.setTutorProfile(activeProfile);
        tr.setStatus(TutorRequest.Status.NEW);

        when(requestRepository.findById(reqId)).thenReturn(Optional.of(tr));

        assertThatThrownBy(() -> service.markViewed(reqId, UUID.randomUUID()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Not your request");
    }
}
