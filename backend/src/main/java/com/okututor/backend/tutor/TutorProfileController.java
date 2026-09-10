package com.okututor.backend.tutor;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.search.TutorSearchService;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.tutor.dto.TutorProfileCreateRequest;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.dto.TutorProfileUpdateRequest;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1", "/api"})
public class TutorProfileController {

    private final TutorProfileService service;
    private final TutorProfileRepository repository;
    private final TutorSearchService tutorSearchService;
    private final com.okututor.backend.common.ratelimit.RateLimitService rateLimitService;

    public TutorProfileController(TutorProfileService service, TutorProfileRepository repository, TutorSearchService tutorSearchService, com.okututor.backend.common.ratelimit.RateLimitService rateLimitService) {
        this.service = service;
        this.repository = repository;
        this.tutorSearchService = tutorSearchService;
        this.rateLimitService = rateLimitService;
    }

    // Public listing — supports both legacy filters and spec search params (q, subject, level, city, district, language, sort, min/maxPrice)
    // Spec alias: GET /api/tutors/resumes — Instagram feed
    @GetMapping({"/tutors", "/tutors/resumes", "/tutor-profiles", "/tutors/resumes/"})
    public Page<TutorProfileResponse> listing(@RequestParam(required = false) String q,
                                              @RequestParam(required = false) String subject,
                                              @RequestParam(required = false) String level,
                                              @RequestParam(required = false) String city,
                                              @RequestParam(required = false) String district,
                                              @RequestParam(required = false, name = "tutor_type") String tutorTypeParam,
                                              @RequestParam(required = false, name = "tutorType") String tutorTypeAlias,
                                              @RequestParam(required = false) Boolean online,
                                              @RequestParam(required = false) Boolean offline,
                                              @RequestParam(required = false) String language,
                                              @RequestParam(required = false, name = "minPrice") BigDecimal minPrice,
                                              @RequestParam(required = false, name = "maxPrice") BigDecimal maxPrice,
                                              @RequestParam(required = false, name = "price_from") BigDecimal priceFromAlias,
                                              @RequestParam(required = false, name = "price_to") BigDecimal priceToAlias,
                                              @RequestParam(required = false) String sort,
                                              // legacy UUID params
                                              @RequestParam(required = false) String tutor_type,
                                              @RequestParam(required = false) UUID city_id,
                                              @RequestParam(required = false) UUID district_id,
                                              @RequestParam(required = false) BigDecimal price_from,
                                              @RequestParam(required = false) BigDecimal price_to,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        // unify aliases
        String tutorType = tutorTypeParam != null ? tutorTypeParam : (tutorTypeAlias != null ? tutorTypeAlias : tutor_type);
        BigDecimal priceFrom = minPrice != null ? minPrice : (priceFromAlias != null ? priceFromAlias : price_from);
        BigDecimal priceTo = maxPrice != null ? maxPrice : (priceToAlias != null ? priceToAlias : price_to);
        // if city_id provided but city slug not, resolve city via id -> slug handled in service publicListing (needs UUID) else search service handles slug
        // decide path: if q present or level/district/language/sort present -> delegate to search service for full-text + filters
        boolean useSearch = (q != null && !q.isBlank()) || (subject != null && !subject.isBlank())
                || (level != null && !level.isBlank()) || (language != null && !language.isBlank())
                || (district != null && !district.isBlank()) || (sort != null && !sort.isBlank())
                || (city != null && !city.isBlank());
        if (useSearch) {
            // city param priority: slug city > city_id, district similarly
            String citySlug = city;
            if (citySlug == null && city_id != null) {
                // resolve to slug? for search we need slug; fallback to publicListing if only UUID
                return service.publicListing(page, size, tutorType, city_id, district_id, online, offline, priceFrom, priceTo);
            }
            return tutorSearchService.search(q, subject, citySlug, tutorType, priceFrom, priceTo, online, offline, language, level, district, sort, page, size);
        }
        // legacy path without q
        return service.publicListing(page, size, tutorType, city_id, district_id, online, offline, priceFrom, priceTo);
    }

    // Public profile by slug — increments views. Must be after /tutors/me exact match.
    @GetMapping("/tutors/{slug}")
    public TutorProfileResponse bySlug(@PathVariable String slug) {
        if ("me".equalsIgnoreCase(slug) || "resumes".equalsIgnoreCase(slug)) {
            throw ApiException.notFound("Tutor profile not found");
        }
        TutorProfileResponse resp = service.getBySlugPublic(slug);
        try {
            var p = repository.findBySlug(slug);
            p.ifPresent(profile -> service.incrementViews(profile.getId()));
        } catch (Exception ignored) {}
        return resp;
    }

    // Spec alias: GET /api/tutors/resumes/:id (by UUID) + also slug fallback
    @GetMapping("/tutors/resumes/{id}")
    public TutorProfileResponse byResumeId(@PathVariable String id) {
        // try UUID first
        try {
            UUID uuid = UUID.fromString(id);
            TutorProfileResponse byId = service.getByIdForAdmin(uuid);
            if (!"PUBLISHED".equals(byId.status())) throw ApiException.notFound("Tutor profile not found");
            try { service.incrementViews(uuid); } catch (Exception ignored) {}
            return byId;
        } catch (IllegalArgumentException e) {
            // fallback to slug
            return bySlug(id);
        }
    }

    // Legacy compat: GET /api/v1/tutors/by-user/{userId} not needed; slug is primary

    // Owner endpoints — support both spec /tutors and legacy /tutor-profiles
    @PostMapping({"/tutors", "/tutor-profiles"})
    public TutorProfileResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                       @RequestBody @Valid TutorProfileCreateRequest body) {
        requireAuth(principal);
        rateLimitService.checkTutorProfileCreate(principal.id().toString());
        return service.create(principal.id(), body);
    }

    @GetMapping({"/tutors/me", "/tutor-profiles/me"})
    public TutorProfileResponse myProfile(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.getByUserId(principal.id(), true);
    }

    @PutMapping({"/tutors/me", "/tutor-profiles/me"})
    public TutorProfileResponse update(@AuthenticationPrincipal UserPrincipal principal,
                                       @RequestBody @Valid TutorProfileUpdateRequest body) {
        requireAuth(principal);
        return service.update(principal.id(), body);
    }

    @DeleteMapping({"/tutors/me", "/tutor-profiles/me"})
    public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        service.deleteByUserId(principal.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping({"/tutors/me/submit", "/tutor-profiles/me/submit"})
    public TutorProfileResponse submit(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.submit(principal.id(), principal.id());
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
    }
}
