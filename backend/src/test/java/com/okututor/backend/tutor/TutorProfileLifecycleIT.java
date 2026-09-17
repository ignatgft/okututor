package com.okututor.backend.tutor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.tutor.dto.TutorProfileCreateRequest;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Lifecycle: DRAFT -> PENDING_MODERATION -> PUBLISHED -> HIDDEN + 30d expiry + renew + soft delete
 * Covers creation, submission, confirmation (approve), search exclusion.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TutorProfileLifecycleIT {

    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine").withReuse(false);

    @Autowired TutorProfileRepository repo;
    @Autowired TutorProfileService service;
    @Autowired UserRepository userRepo;
    @Autowired PasswordEncoder encoder;

    private User createUser(String email) {
        var u = new User();
        u.setEmail(email);
        u.setFirstName("Test");
        u.setLastName("User");
        u.setRole(Role.USER);
        u.setVerified(true);
        u.setPasswordHash(encoder.encode("Test#12345678"));
        return userRepo.save(u);
    }

    private static TutorProfileCreateRequest request(String title) {
        return new TutorProfileCreateRequest(
                "T", "U", title, "short", "about", "STUDENT_TUTOR",
                "edu", "uni", "details", 5,
                BigDecimal.valueOf(800), BigDecimal.valueOf(1500), "KGS",
                true, false, null, null, "+996500000000",
                List.of(), List.of(), List.of("Русский"),
                "https://img.example.com/resume.png");
    }

    /** create (DRAFT) -> submit (PENDING_MODERATION) -> approve (PUBLISHED, 30d expiry). */
    private TutorProfile createAndApprove(User user, String title) {
        var resp = service.create(user.getId(), request(title));
        assertThat(resp.status()).isEqualTo("DRAFT");
        var p = repo.findByUserId(user.getId()).orElseThrow();
        service.submit(user.getId(), user.getId());
        service.approve(p.getId(), user.getId());
        return repo.findByUserId(user.getId()).orElseThrow();
    }

    @Test
    void create_setsDraft_and_publish_setsActive30d() {
        var user = createUser("lifecycle-" + UUID.randomUUID() + "@test.com");
        var p = createAndApprove(user, "Math");
        assertThat(p.getStatus()).isEqualTo(TutorProfileStatus.PUBLISHED);
        assertThat(p.getExpiresAt()).isAfter(Instant.now().plusSeconds(29 * 86400));
        assertThat(p.getPublishedAt()).isNotNull();
    }

    @Test
    void renew_allowsRenewalAndDoesNotStack() {
        var user = createUser("renew-" + UUID.randomUUID() + "@test.com");
        createAndApprove(user, "Math");
        var p = repo.findByUserId(user.getId()).orElseThrow();
        Instant firstExpiry = p.getExpiresAt();
        // renewal too early (resume still active with many days left) must be rejected to prevent stacking
        assertThatThrownBy(() -> service.renew(user.getId()))
                .isInstanceOf(ApiException.class);
        // simulate expiry: resume is inactive -> renewal is allowed, resets to now+30d (not now+60d)
        p.setExpiresAt(Instant.now().plusSeconds(1L * 86400));
        p.setStatus(TutorProfileStatus.PUBLISHED);
        repo.save(p);
        service.renew(user.getId());
        p = repo.findByUserId(user.getId()).orElseThrow();
        assertThat(p.getExpiresAt()).isAfter(Instant.now().plusSeconds(29L * 86400));
        assertThat(p.getExpiresAt()).isBefore(Instant.now().plusSeconds(31L * 86400));
        assertThat(p.getExpiresAt().isAfter(firstExpiry.plusSeconds(29L * 86400))).isFalse();
    }

    @Test
    void hide_and_unhide() {
        var user = createUser("hide-" + UUID.randomUUID() + "@test.com");
        createAndApprove(user, "t");
        service.hide(user.getId());
        assertThat(repo.findByUserId(user.getId()).orElseThrow().getStatus()).isEqualTo(TutorProfileStatus.HIDDEN);
        service.unhide(user.getId());
        assertThat(repo.findByUserId(user.getId()).orElseThrow().getStatus()).isEqualTo(TutorProfileStatus.PUBLISHED);
    }

    @Test
    void delete_softThenHard() {
        var user = createUser("del-" + UUID.randomUUID() + "@test.com");
        createAndApprove(user, "t");
        service.deleteByUserId(user.getId());
        var deleted = repo.findByUserId(user.getId()).orElseThrow();
        assertThat(deleted.getStatus()).isEqualTo(TutorProfileStatus.DELETED);
        assertThat(deleted.getDeletedAt()).isNotNull();
        // second delete of an already soft-deleted resume is treated as not found
        assertThatThrownBy(() -> service.deleteByUserId(user.getId()))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void expired_notInSearch() {
        var user = createUser("exp-" + UUID.randomUUID() + "@test.com");
        createAndApprove(user, "t");
        var p = repo.findByUserId(user.getId()).orElseThrow();
        p.setExpiresAt(Instant.now().minusSeconds(3600));
        p.setStatus(TutorProfileStatus.EXPIRED);
        repo.save(p);
        var page = repo.findPublishedExcludingBlocked(TutorProfileStatus.PUBLISHED, PageRequest.of(0, 20));
        assertThat(page.getContent().stream().anyMatch(x -> x.getId().equals(p.getId()))).isFalse();
    }
}