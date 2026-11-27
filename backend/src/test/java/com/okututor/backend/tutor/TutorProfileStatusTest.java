package com.okututor.backend.tutor;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class TutorProfileStatusTest {

    @Test
    void hide_setsHidden() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.PUBLISHED);
        p.hide();
        assertThat(p.getStatus()).isEqualTo(TutorProfileStatus.HIDDEN);
        assertThat(p.getHiddenAt()).isNotNull();
    }

    @Test
    void unhide_restoresPublished() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.HIDDEN);
        p.unhide();
        assertThat(p.getStatus()).isEqualTo(TutorProfileStatus.PUBLISHED);
        assertThat(p.getHiddenAt()).isNull();
    }

    @Test
    void hide_onlyFromPublished() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.DRAFT);
        assertThatThrownBy(p::hide).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void softDelete_setsDeleted() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.PUBLISHED);
        // TutorProfileService.deleteByUserId soft-deletes (V53)
        p.softDelete();
        assertThat(p.getStatus()).isEqualTo(TutorProfileStatus.DELETED);
        assertThat(p.getDeletedAt()).isNotNull();
    }

    @Test
    void allStatuses_presentInDbConstraint() {
        // V53 must allow these 10 values — ensure enum matches DB check
        assertThat(TutorProfileStatus.values()).containsExactlyInAnyOrder(
                TutorProfileStatus.DRAFT,
                TutorProfileStatus.PENDING_MODERATION,
                TutorProfileStatus.PUBLISHED,
                TutorProfileStatus.ACTIVE,
                TutorProfileStatus.REJECTED,
                TutorProfileStatus.SUSPENDED,
                TutorProfileStatus.EXPIRED,
                TutorProfileStatus.HIDDEN,
                TutorProfileStatus.ARCHIVED,
                TutorProfileStatus.DELETED
        );
    }

    @Test
    void expiry_setsExpired() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.PUBLISHED);
        p.setExpiresAt(java.time.Instant.now().minusSeconds(3600));
        assertThat(p.isExpired()).isTrue();
    }

    @Test
    void mapper_expiringSoonThreshold_7days() {
        TutorProfileMapper mapper = new TutorProfileMapper();
        com.okututor.backend.user.User u = new com.okututor.backend.user.User();
        u.setId(java.util.UUID.randomUUID());
        u.setEmail("tutor@test.kg");

        TutorProfile p7 = new TutorProfile();
        p7.setUser(u);
        p7.setStatus(TutorProfileStatus.PUBLISHED);
        p7.setExpiresAt(java.time.Instant.now().plusSeconds(5L * 24 * 3600)); // 5 days -> true
        com.okututor.backend.tutor.dto.TutorProfileResponse resp7 = mapper.toResponse(p7, java.util.List.of(), java.util.List.of(), java.util.List.of(), false);
        assertThat(resp7.expiringSoon()).isTrue();

        TutorProfile p10 = new TutorProfile();
        p10.setUser(u);
        p10.setStatus(TutorProfileStatus.PUBLISHED);
        p10.setExpiresAt(java.time.Instant.now().plusSeconds(10L * 24 * 3600)); // 10 days -> false
        com.okututor.backend.tutor.dto.TutorProfileResponse resp10 = mapper.toResponse(p10, java.util.List.of(), java.util.List.of(), java.util.List.of(), false);
        assertThat(resp10.expiringSoon()).isFalse();

        TutorProfile pNull = new TutorProfile();
        pNull.setUser(u);
        pNull.setStatus(TutorProfileStatus.PUBLISHED);
        pNull.setExpiresAt(null);
        com.okututor.backend.tutor.dto.TutorProfileResponse respNull = mapper.toResponse(pNull, java.util.List.of(), java.util.List.of(), java.util.List.of(), false);
        assertThat(respNull.noindex()).isTrue();
    }
}
