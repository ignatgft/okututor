package com.okututor.backend.share;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ResumeShareController {

    private final ResumeShareService service;

    public ResumeShareController(ResumeShareService service) {
        this.service = service;
    }

    /** Owner only: create (or fetch existing) share link for a resume. */
    @PostMapping("/resumes/{id}/share")
    public ShareResponse create(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAuth(principal);
        return service.create(id, principal.id());
    }

    /** Owner only: current active share link for a resume, if any. */
    @GetMapping("/resumes/{id}/share")
    public ShareResponse getOwn(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAuth(principal);
        return service.getForOwner(id, principal.id());
    }

    /** Owner only: revoke share link. */
    @DeleteMapping("/resumes/{id}/share")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAuth(principal);
        service.revoke(id, principal.id());
        return ResponseEntity.noContent().build();
    }

    /** Public: view a shared resume by token (works for any resume status). */
    @GetMapping("/shares/{token}")
    public ShareViewResponse view(@PathVariable String token) {
        return service.viewByToken(token, null);
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
    }
}