package com.okututor.backend.tutor;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/admin/tutor-profiles", "/api/v1/admin/tutors"})
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class TutorModerationController {

    private final TutorProfileService service;

    public TutorModerationController(TutorProfileService service) { this.service = service; }

    @GetMapping
    public Page<TutorProfileResponse> list(@RequestParam(required = false) String status,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return service.adminList(status, page, size);
    }

    @GetMapping("/{id}")
    public TutorProfileResponse detail(@PathVariable UUID id) {
        return service.getByIdForAdmin(id);
    }

    @PostMapping("/{id}/approve")
    public TutorProfileResponse approve(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        requireAdmin(principal);
        return service.approve(id, principal.id());
    }

    @PostMapping("/{id}/reject")
    public TutorProfileResponse reject(@PathVariable UUID id,
                                       @RequestBody(required = false) Map<String, String> body,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        requireAdmin(principal);
        String reason = body == null ? null : body.get("reason");
        if (reason == null) reason = body == null ? null : body.get("rejection_reason");
        return service.reject(id, reason, principal.id());
    }

    @PostMapping("/{id}/suspend")
    public TutorProfileResponse suspend(@PathVariable UUID id,
                                        @RequestBody(required = false) Map<String, String> body,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        requireAdmin(principal);
        String reason = body == null ? null : body.get("reason");
        return service.suspend(id, reason, principal.id());
    }

    @PostMapping("/{id}/restore")
    public TutorProfileResponse restore(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        requireAdmin(principal);
        return service.restore(id, principal.id());
    }

    private void requireAdmin(UserPrincipal p) {
        if (p == null) throw ApiException.unauthorized("Authentication required");
        if (!p.isAdminLike()) throw ApiException.forbidden("Admin required");
    }
}
