package com.okututor.backend.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReviewServiceTest {

    private ReviewRepository reviewRepository;
    private ReviewService service;

    private User student;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        reviewRepository = mock(ReviewRepository.class);
        service = new ReviewService(reviewRepository, org.mockito.Mockito.mock(com.okututor.backend.observability.ObservabilityMetrics.class));

        student = new User();
        student.setId(UUID.randomUUID());
        student.setRole(Role.STUDENT);
        student.setFirstName("Stu");
        student.setLastName("Dent");

        courseId = UUID.randomUUID();
        when(reviewRepository.findByCourseIdAndStudentId(any(), any())).thenReturn(Optional.empty());
    }

    @Test
    void canReview_trueWhenNotAlreadyReviewed() {
        when(reviewRepository.findByCourseIdAndStudentId(courseId, student.getId())).thenReturn(Optional.empty());
        ReviewService.CanReviewResponse res = service.canReview(student.getId(), courseId);
        assertThat(res.eligible()).isTrue();
        assertThat(res.already_reviewed()).isFalse();
    }

    @Test
    void canReview_falseWhenAlreadyReviewed() {
        when(reviewRepository.findByCourseIdAndStudentId(courseId, student.getId()))
                .thenReturn(Optional.of(new Review()));

        ReviewService.CanReviewResponse res = service.canReview(student.getId(), courseId);
        assertThat(res.eligible()).isFalse();
        assertThat(res.already_reviewed()).isTrue();
    }

    @Test
    void create_throwsConflictWhenAlreadyReviewed() {
        when(reviewRepository.findByCourseIdAndStudentId(courseId, student.getId()))
                .thenReturn(Optional.of(new Review()));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.create(student, courseId, 5, "Great!"))
                .isInstanceOf(com.okututor.backend.common.error.ApiException.class);
    }
}
