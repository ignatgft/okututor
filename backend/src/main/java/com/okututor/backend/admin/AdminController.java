package com.okututor.backend.admin;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.common.error.FieldValidationException;
import com.okututor.backend.request.TutorRequestRepository;
import com.okututor.backend.review.Review;
import com.okututor.backend.review.ReviewRepository;
import com.okututor.backend.review.ReviewService;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * поверхность админ-модерации. Каждое изменяющее действие пишется в аудит; RBAC enforced
 * и через @PreAuthorize, и явными guard-ами (defense in depth).
 * Legacy Course/Booking/Enrollment/Lesson/TutorApplication удалены — оставлены user/review/tutorProfile.
 */
@RestController
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminController {

    public record RoleRequest(String role) {}
    public record ReasonRequest(String reason) {}

    public record AdminUserResponse(
            UUID id,
            String email,
            String full_name,
            String role,
            boolean verified,
            boolean blocked,
            Instant created_at
    ) {}

    private final ReviewService reviewService;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final TutorRequestRepository tutorRequestRepository;
    private final AuditLogService auditLog;

    public AdminController(ReviewService reviewService,
                           UserRepository userRepository,
                           ReviewRepository reviewRepository,
                           TutorProfileRepository tutorProfileRepository,
                           TutorRequestRepository tutorRequestRepository,
                           AuditLogService auditLog) {
        this.reviewService = reviewService;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.tutorProfileRepository = tutorProfileRepository;
        this.tutorRequestRepository = tutorRequestRepository;
        this.auditLog = auditLog;
    }

    static void requireAdmin(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        if (!principal.isAdminLike()) {
            throw ApiException.forbidden("You do not have permission for this action.");
        }
    }

    static void requireSuperAdmin(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        if (principal.role() != Role.SUPER_ADMIN) {
            throw ApiException.forbidden("Only a SUPER_ADMIN can perform this action");
        }
    }

    // ---------- пользователи ----------

    @GetMapping("/api/v1/admin/users")
    public Page<AdminUserResponse> users(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) String role,
                                         @RequestParam(name = "blocked", required = false) Boolean blocked,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Role roleFilter = safeRole(role);
        Page<User> result = userRepository.searchAdmin(q == null ? null : q.trim().toLowerCase(),
                roleFilter, blocked, pageable);
        return result.map(this::toAdminUser);
    }

    @PutMapping("/api/v1/admin/users/{id}/block")
    public AdminUserResponse block(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAdmin(principal);
        if (principal.id().equals(id)) {
            throw ApiException.forbidden("Cannot block yourself");
        }
        User target = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (target.getRole() == Role.SUPER_ADMIN && principal.role() != Role.SUPER_ADMIN) {
            throw ApiException.forbidden("Only a SUPER_ADMIN can block a SUPER_ADMIN");
        }
        target.setBlocked(true);
        auditLog.log(new AuditEntry(principal.id(), "USER_BLOCK", "USER", id.toString(), null));
        return toAdminUser(userRepository.save(target));
    }

    @PutMapping("/api/v1/admin/users/{id}/unblock")
    public AdminUserResponse unblock(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAdmin(principal);
        User target = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        target.setBlocked(false);
        auditLog.log(new AuditEntry(principal.id(), "USER_UNBLOCK", "USER", id.toString(), null));
        return toAdminUser(userRepository.save(target));
    }

    @PutMapping("/api/v1/admin/users/{id}/role")
    public AdminUserResponse changeRole(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable UUID id,
                                        @RequestBody(required = false) RoleRequest request) {
        requireSuperAdmin(principal);
        if (request == null || request.role() == null) {
            throw new FieldValidationException(Map.of("role", "role is required"));
        }
        Role newRole = safeRole(request.role());
        if (newRole == null) {
            throw ApiException.validation("Unknown role: " + request.role());
        }
        User target = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        boolean touchesAdminLike = target.getRole() == Role.ADMIN || target.getRole() == Role.SUPER_ADMIN
                || newRole == Role.ADMIN || newRole == Role.SUPER_ADMIN;
        if (touchesAdminLike && principal.role() != Role.SUPER_ADMIN) {
            throw ApiException.forbidden("Only a SUPER_ADMIN can manage admin roles");
        }
        target.setRole(newRole);
        auditLog.log(new AuditEntry(principal.id(), "ROLE_CHANGE", "USER", id.toString(), newRole.name()));
        return toAdminUser(userRepository.save(target));
    }

    @PutMapping("/api/v1/admin/users/{id}/verify")
    public AdminUserResponse verify(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAdmin(principal);
        User target = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        target.setVerified(true);
        auditLog.log(new AuditEntry(principal.id(), "USER_VERIFY", "USER", id.toString(), null));
        return toAdminUser(userRepository.save(target));
    }

    // ---------- статистика ----------

    @GetMapping("/api/v1/admin/stats")
    public Map<String, Long> stats() {
        Instant in7 = Instant.now().plus(Duration.ofDays(7));
        var m = new LinkedHashMap<String, Long>();
        m.put("total_users", userRepository.count());
        m.put("total_reviews", reviewRepository.count());
        m.put("total_tutor_profiles", tutorProfileRepository.count());
        m.put("pending_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.PENDING_MODERATION));
        m.put("published_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.PUBLISHED));
        m.put("active_tutor_profiles", tutorProfileRepository.countActive());
        m.put("expiring_soon_tutor_profiles", tutorProfileRepository.countExpiringSoon(in7));
        m.put("expired_tutor_profiles", tutorProfileRepository.countExpired());
        m.put("hidden_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.HIDDEN));
        m.put("archived_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.ARCHIVED));
        m.put("total_tutor_requests", tutorRequestRepository.count());
        return Collections.unmodifiableMap(m);
    }

    // ---------- модерация отзывов ----------

    @GetMapping("/api/v1/admin/reviews")
    public Page<Map<String, Object>> reviews(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        return reviewService.listAll(page, size).map(this::toReviewMap);
    }

    @PostMapping("/api/v1/admin/reviews/{id}/hide")
    public ResponseEntity<Void> hideReview(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAdmin(principal);
        auditLog.log(new AuditEntry(principal.id(), "REVIEW_HIDE", "REVIEW", id.toString(), null));
        reviewService.setHidden(id, true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/reviews/{id}/restore")
    public ResponseEntity<Void> restoreReview(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable UUID id) {
        requireAdmin(principal);
        auditLog.log(new AuditEntry(principal.id(), "REVIEW_RESTORE", "REVIEW", id.toString(), null));
        reviewService.setHidden(id, false);
        return ResponseEntity.noContent().build();
    }

    // ---------- метрики (adminApi.metrics) ----------

    @GetMapping("/api/v1/admin/metrics/overview")
    public Map<String, Object> metricsOverview() {
        Instant in7 = Instant.now().plus(Duration.ofDays(7));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total_users", userRepository.count());
        result.put("total_tutors", tutorProfileRepository.countByStatus(TutorProfileStatus.PUBLISHED));
        result.put("active_tutor_profiles", tutorProfileRepository.countActive());
        result.put("expiring_soon_tutor_profiles", tutorProfileRepository.countExpiringSoon(in7));
        result.put("expired_tutor_profiles", tutorProfileRepository.countExpired());
        result.put("hidden_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.HIDDEN));
        result.put("archived_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.ARCHIVED));
        result.put("pending_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.PENDING_MODERATION));
        result.put("rejected_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.REJECTED));
        result.put("suspended_tutor_profiles", tutorProfileRepository.countByStatus(TutorProfileStatus.SUSPENDED));
        result.put("total_tutor_requests", tutorRequestRepository.count());
        result.put("total_reviews", reviewRepository.count());
        return Collections.unmodifiableMap(result);
    }

    @GetMapping("/api/v1/admin/metrics/users")
    public Map<String, Object> metricsUsers(@RequestParam(name = "days", defaultValue = "30") int days) {
        Instant from = Instant.now().minus(
                Duration.ofDays(Math.max(days, 1)));
        Map<String, Long> byRole = new LinkedHashMap<>();
        for (Object[] row : userRepository.countGroupByRole()) {
            byRole.put(((Role) row[0]).name(), (Long) row[1]);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", userRepository.count());
        result.put("by_role", byRole);
        result.put("new_in_period", userRepository.countByCreatedAtAfter(from));
        result.put("blocked", userRepository.countByBlocked(true));
        result.put("verified", userRepository.countByVerified(true));
        result.put("period_days", Math.max(days, 1));
        return result;
    }

    private AdminUserResponse toAdminUser(User user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole().name(), user.isVerified(), user.isBlocked(), user.getCreatedAt());
    }

    private Map<String, Object> toReviewMap(Review r) {
        return Map.of(
                "id", r.getId().toString(),
                "course_id", r.getCourseId() != null ? r.getCourseId().toString() : "",
                "rating", r.getRating(),
                "comment", r.getComment() == null ? "" : r.getComment(),
                "student_id", r.getStudent() != null ? r.getStudent().getId().toString() : "",
                "student_name", r.getStudent() != null ? r.getStudent().getFullName() : "",
                "hidden", r.isHidden(),
                "created_at", r.getCreatedAt().toString());
    }

    private static Role safeRole(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Role.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
