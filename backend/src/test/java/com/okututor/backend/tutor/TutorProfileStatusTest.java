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
}
