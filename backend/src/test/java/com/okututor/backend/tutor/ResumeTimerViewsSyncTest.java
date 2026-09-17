package com.okututor.backend.tutor;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.okututor.backend.common.error.ApiException;

class ResumeTimerViewsSyncTest {

    @Test
    void approveSets30DaysExpiry() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.PENDING_MODERATION);
        p.setPhotoUrl("https://cdn.example.com/photo.webp");
        p.approve();
        assertThat(p.getStatus()).isEqualTo(TutorProfileStatus.PUBLISHED);
        assertThat(p.getExpiresAt()).isAfter(Instant.now().plusSeconds(29L * 24 * 3600));
        assertThat(p.getExpiresAt()).isBefore(Instant.now().plusSeconds(31L * 24 * 3600));
    }

    @Test
    void renewResetsToNowPlus30Days() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.PUBLISHED);
        Instant now = Instant.now();
        p.setPublishedAt(now.minusSeconds(10L * 24 * 3600));
        p.setExpiresAt(now.plusSeconds(20L * 24 * 3600));
        p.renew();
        assertThat(p.getExpiresAt()).isAfter(Instant.now().plusSeconds(29L * 24 * 3600));
        assertThat(p.getExpiresAt()).isBefore(Instant.now().plusSeconds(31L * 24 * 3600));
    }

    @Test
    void renewFromNowIfAlreadyExpired() {
        TutorProfile p = new TutorProfile();
        p.setStatus(TutorProfileStatus.EXPIRED);
        p.setExpiresAt(Instant.now().minusSeconds(5L * 24 * 3600));
        p.renew();
        assertThat(p.getStatus()).isEqualTo(TutorProfileStatus.PUBLISHED);
        assertThat(p.getExpiresAt()).isAfter(Instant.now().plusSeconds(29L * 24 * 3600));
    }

    @Test
    void isExpiringSoonWithin7Days() {
        TutorProfile p = new TutorProfile();
        p.setExpiresAt(Instant.now().plusSeconds(3L * 24 * 3600));
        assertThat(p.isExpiringSoon(7)).isTrue();
        assertThat(p.isExpiringSoon(1)).isFalse();
    }

    @Test
    void viewsIncrementNotCached() {
        TutorProfile p = new TutorProfile();
        p.setViewsCount(5);
        assertThat(p.getViewsCount()).isEqualTo(5);
        p.setViewsCount(p.getViewsCount() + 1);
        assertThat(p.getViewsCount()).isEqualTo(6);
    }
}
