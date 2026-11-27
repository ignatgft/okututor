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

    @Test
    void create_rejectsOversizedComment() {
        String longComment = "a".repeat(2001);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.create(student, courseId, 5, longComment))
                .isInstanceOf(com.okututor.backend.common.error.FieldValidationException.class)
                .satisfies(ex -> {
                    com.okututor.backend.common.error.FieldValidationException fve = (com.okututor.backend.common.error.FieldValidationException) ex;
                    assertThat(fve.getFieldErrors()).containsKey("comment");
                });
    }

    @Test
    void create_sanitizesHtmlInComment() {
        when(reviewRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        String rawComment = "Great tutor! <script>alert('xss')</script><b>Bold</b>";
        ReviewService.ReviewResponse res = service.create(student, courseId, 5, rawComment);
        assertThat(res.comment()).doesNotContain("<script>");
        assertThat(res.comment()).contains("Great tutor!");
    }
}
