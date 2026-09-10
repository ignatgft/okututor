package com.okututor.backend.request;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.common.ratelimit.RateLimitService;
import com.okututor.backend.request.dto.TutorRequestCreateRequest;
import com.okututor.backend.request.dto.TutorRequestResponse;
import com.okututor.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class TutorRequestController {

    private final TutorRequestService service;
    private final RateLimitService rateLimitService;

    public TutorRequestController(TutorRequestService service, RateLimitService rateLimitService) {
        this.service = service;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping("/tutor-requests")
    public TutorRequestResponse create(@RequestBody @Valid TutorRequestCreateRequest body,
                                       @AuthenticationPrincipal UserPrincipal principal,
                                       jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        try { rateLimitService.checkTutorRequest(ip); } catch (com.okututor.backend.common.error.ApiException e) { throw e; } catch (Exception ignored) { throw com.okututor.backend.common.error.ApiException.rateLimited("Too many requests. Please slow down."); }
        if (principal != null) {
            try { rateLimitService.checkTutorRequestByUser(principal.id().toString()); } catch (com.okututor.backend.common.error.ApiException e) { throw e; } catch (Exception ignored) { throw com.okututor.backend.common.error.ApiException.rateLimited("Too many requests. Please slow down."); }
        }
        return service.create(body, principal == null ? null : principal.id());
    }

    // Spec: GET /api/v1/tutor-requests (auth required, returns own requests — student → student, tutor → incoming)
    @GetMapping("/tutor-requests")
    public Page<TutorRequestResponse> list(@AuthenticationPrincipal UserPrincipal principal,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        // try student first, if has student requests return them; else tutor incoming; prioritize student
        var studentPage = service.forStudent(principal.id(), page, size);
        if (studentPage.getTotalElements() > 0) return studentPage;
        return service.forTutor(principal.id(), page, size);
    }

    @GetMapping("/tutor-requests/me")
    public Page<TutorRequestResponse> myRequests(@AuthenticationPrincipal UserPrincipal principal,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        return service.forStudent(principal.id(), page, size);
    }

    @GetMapping("/tutor-profiles/me/requests")
    public Page<TutorRequestResponse> incoming(@AuthenticationPrincipal UserPrincipal principal,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        return service.forTutor(principal.id(), page, size);
    }

    // Legacy alias used by TutorSearchService spec: also support /tutors/me/requests
    @GetMapping({"/tutors/me/requests", "/tutor-requests/incoming"})
    public Page<TutorRequestResponse> incomingAlias(@AuthenticationPrincipal UserPrincipal principal,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        return service.forTutor(principal.id(), page, size);
    }

    @PostMapping("/tutor-requests/{id}/viewed")
    public TutorRequestResponse viewed(@PathVariable java.util.UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        return service.markViewed(id, principal.id());
    }

    @PostMapping("/tutor-requests/{id}/status")
    public TutorRequestResponse updateStatus(@PathVariable java.util.UUID id,
                                             @RequestBody Map<String, String> body,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        String status = body.get("status");
        if (status == null) throw ApiException.validation("status is required");
        return service.updateStatus(id, principal.id(), status);
    }

    @PatchMapping("/tutor-requests/{id}")
    public TutorRequestResponse patch(@PathVariable java.util.UUID id,
                                      @RequestBody Map<String, String> body,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        String status = body == null ? null : body.get("status");
        if (status == null) status = body == null ? null : body.get("state");
        if (status == null) throw ApiException.validation("status is required");
        return service.updateStatus(id, principal.id(), status);
    }

    @GetMapping({"/admin/tutor-requests", "/admin/requests"})
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Page<TutorRequestResponse> adminList(@RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return service.adminList(page, size);
    }
}
