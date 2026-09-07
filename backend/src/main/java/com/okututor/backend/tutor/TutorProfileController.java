package com.okututor.backend.tutor;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.tutor.dto.TutorProfileCreateRequest;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.dto.TutorProfileUpdateRequest;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class TutorProfileController {

    private final TutorProfileService service;
    private final TutorProfileRepository repository;

    public TutorProfileController(TutorProfileService service, TutorProfileRepository repository) {
        this.service = service;
        this.repository = repository;
    }

    // Public listing — filters delegated to service
    @GetMapping("/tutors")
    public Page<TutorProfileResponse> listing(@RequestParam(required = false) String tutor_type,
                                              @RequestParam(required = false) UUID city_id,
                                              @RequestParam(required = false) UUID district_id,
                                              @RequestParam(required = false) Boolean online,
                                              @RequestParam(required = false) Boolean offline,
                                              @RequestParam(required = false) BigDecimal price_from,
                                              @RequestParam(required = false) BigDecimal price_to,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return service.publicListing(page, size, tutor_type, city_id, district_id, online, offline, price_from, price_to);
    }

    // Public profile by slug — increments views
    @GetMapping("/tutors/{slug}")
    public TutorProfileResponse bySlug(@PathVariable String slug) {
        // slug may be UUID? fallback to UUID lookup? We treat both: if UUID try id
        TutorProfileResponse resp = service.getBySlugPublic(slug);
        // async views increment (best effort)
        try {
            var p = repository.findBySlug(slug);
            p.ifPresent(profile -> service.incrementViews(profile.getId()));
        } catch (Exception ignored) {}
        return resp;
    }

    // Legacy compat: GET /api/v1/tutors/by-user/{userId} not needed; slug is primary

    // Owner endpoints
    @PostMapping("/tutor-profiles")
    public TutorProfileResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                       @RequestBody @Valid TutorProfileCreateRequest body) {
        requireAuth(principal);
        return service.create(principal.id(), body);
    }

    @GetMapping("/tutor-profiles/me")
    public TutorProfileResponse myProfile(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.getByUserId(principal.id(), true);
    }

    @PutMapping("/tutor-profiles/me")
    public TutorProfileResponse update(@AuthenticationPrincipal UserPrincipal principal,
                                       @RequestBody @Valid TutorProfileUpdateRequest body) {
        requireAuth(principal);
        return service.update(principal.id(), body);
    }

    @PostMapping("/tutor-profiles/me/submit")
    public TutorProfileResponse submit(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.submit(principal.id(), principal.id());
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
    }
}
