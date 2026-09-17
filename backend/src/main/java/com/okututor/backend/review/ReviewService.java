package com.okututor.backend.review;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.user.User;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

    public record ReviewResponse(
            UUID id,
            UUID course_id,
            int rating,
            String comment,
            UUID student_id,
            String student_name,
            boolean hidden,
            Instant created_at
    ) {}

    public record ReviewRequest(Integer rating, String comment) {}

    public record CanReviewResponse(
            boolean eligible,
            boolean has_attended,
            boolean already_reviewed
    ) {}

    private final ReviewRepository repository;
    private final com.okututor.backend.observability.ObservabilityMetrics metrics;

    public ReviewService(ReviewRepository repository,
                          com.okututor.backend.observability.ObservabilityMetrics metrics) {
        this.repository = repository;
        this.metrics = metrics;
    }

    /** публичный список — скрытые отзывы исключены. */
    @Transactional(readOnly = true)
    public Page<ReviewResponse> forCourse(UUID courseId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return repository.findByCourseIdAndHiddenFalseOrderByCreatedAtDesc(courseId, pageable).map(this::toResponse);
    }

    /** legacy booking flow — теперь делегирует на свободное создание (без проверки брони). */
    @Transactional
    public ReviewResponse createForBooking(User student, UUID courseId, UUID bookingId,
                                           Integer rating, String comment) {
        return toResponse(persistReview(student, courseId, rating, comment, bookingId));
    }

    /** свободный эндпоинт — проверяет только дубль отзыва. */
    @Transactional
    public ReviewResponse create(User student, UUID courseId, Integer rating, String comment) {
        return toResponse(persistReview(student, courseId, rating, comment, null));
    }

    @Transactional(readOnly = true)
    public CanReviewResponse canReview(UUID studentId, UUID courseId) {
        boolean alreadyReviewed = repository.findByCourseIdAndStudentId(courseId, studentId).isPresent();
        boolean eligible = !alreadyReviewed;
        return new CanReviewResponse(
            eligible,
            false,
            alreadyReviewed
        );
    }

    private Review persistReview(User student, UUID courseId, Integer rating, String comment, UUID bookingId) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new com.okututor.backend.common.error.FieldValidationException(
                    Map.of("rating", "Rating must be between 1 and 5"));
        }
        if (repository.findByCourseIdAndStudentId(courseId, student.getId()).isPresent()) {
            throw ApiException.conflict("You have already reviewed this course");
        }

        Review review = new Review();
        review.setCourseId(courseId);
        review.setStudent(student);
        review.setBookingId(bookingId);
        review.setRating(rating);
        review.setComment(comment);

        try {
            review = repository.saveAndFlush(review);
            metrics.reviewCreated();
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("You have already reviewed this course");
        }
        // legacy rating aggregate на courses удалён — no-op
        return review;
    }

    // --- модерация (админ) ---

    @Transactional(readOnly = true)
    public Page<Review> listAll(int page, int size) {
        return repository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
    }

    @Transactional
    public void setHidden(UUID reviewId, boolean hidden) {
        Review review = repository.findById(reviewId)
                .orElseThrow(() -> ApiException.notFound("Review not found"));
        review.setHidden(hidden);
        repository.save(review);
    }

    private ReviewResponse toResponse(Review r) {
        User student = r.getStudent();
        return new ReviewResponse(
                r.getId(),
                r.getCourseId(),
                r.getRating(),
                r.getComment(),
                student != null ? student.getId() : null,
                student != null ? student.getFullName() : null,
                r.isHidden(),
                r.getCreatedAt());
    }

    static Instant now() {
        return Instant.now();
    }
}
