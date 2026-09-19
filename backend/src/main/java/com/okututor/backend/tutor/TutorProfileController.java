package com.okututor.backend.tutor;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.common.ratelimit.RateLimitService;
import com.okututor.backend.favorite.FavoriteRepository;
import com.okututor.backend.media.MediaService;
import com.okututor.backend.search.TutorSearchService;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.tutor.dto.TutorProfileCreateRequest;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.dto.TutorProfileUpdateRequest;
import com.okututor.backend.user.UserService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/v1", "/api"})
public class TutorProfileController {

    private final TutorProfileService service;
    private final TutorProfileRepository repository;
    private final TutorSearchService tutorSearchService;
    private final RateLimitService rateLimitService;
    private final FavoriteRepository favoriteRepository;
    private final MediaService mediaService;
    private final UserService userService;

    public TutorProfileController(TutorProfileService service, TutorProfileRepository repository, TutorSearchService tutorSearchService, RateLimitService rateLimitService, FavoriteRepository favoriteRepository, MediaService mediaService, UserService userService) {
        this.service = service;
        this.repository = repository;
        this.tutorSearchService = tutorSearchService;
        this.rateLimitService = rateLimitService;
        this.favoriteRepository = favoriteRepository;
        this.mediaService = mediaService;
        this.userService = userService;
    }

    // Public listing — supports both legacy filters and spec search params (q, subject, level, city, district, language, sort, min/maxPrice)
    // Spec alias: GET /api/tutors/resumes — Instagram feed
    @GetMapping({"/tutors", "/tutors/resumes", "/tutor-profiles", "/tutors/resumes/"})
    public Page<TutorProfileResponse> listing(@RequestParam(required = false) String q,
                                              jakarta.servlet.http.HttpServletRequest request,
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
        // rate limiting public listing 100/min per IP
        try {
            String ip = request.getHeader("X-Forwarded-For") != null ? request.getHeader("X-Forwarded-For").split(",")[0].trim() : request.getRemoteAddr();
            rateLimitService.checkPublicListing(ip);
        } catch (Exception ignored) {}
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

    // Slice pagination — no COUNT, for infinite scroll (hasNext + offset still, но без total)
    @GetMapping({"/tutors/slice", "/tutor-profiles/slice"})
    public org.springframework.data.domain.Slice<TutorProfileResponse> slice(
            @RequestParam(required = false) String tutor_type,
            @RequestParam(required = false) UUID city_id,
            @RequestParam(required = false) UUID district_id,
            @RequestParam(required = false) Boolean online,
            @RequestParam(required = false) Boolean offline,
            @RequestParam(required = false) BigDecimal price_from,
            @RequestParam(required = false) BigDecimal price_to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int capped = Math.min(Math.max(size, 1), 50);
        if (tutor_type != null) tutor_type = tutor_type.trim();
        return service.publicSlice(page, capped, tutor_type, city_id, district_id, online, offline, price_from, price_to);
    }

    // Cursor pagination — keyset, no OFFSET, no COUNT, deterministic order publishedAt DESC, id DESC
    @GetMapping({"/tutors/cursor", "/tutor-profiles/cursor"})
    public com.okututor.backend.tutor.dto.TutorSliceResponse<TutorProfileResponse> cursor(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        int capped = Math.min(Math.max(size, 1), 50);
        return service.publicCursor(cursor, capped, null, null, null, null, null, null, null);
    }

    // Популярные репетиторы — для блока "Самые популярные репетиторы" на главной
    // Бизнес-логика: PUBLISHED, не просрочен, не скрыт, сортировка views→rating→reviews→publishedAt
    // Кэшируется на 1 минуту (см. TutorProfileService.getPopular), лимит 1..20, дефолт 6
    @GetMapping({"/tutors/popular", "/tutor-profiles/popular", "/courses/popular", "/tutors/popular/", "/tutor-profiles/popular/"})
    public java.util.List<TutorProfileResponse> popular(@RequestParam(defaultValue = "6") int limit) {
        return service.getPopular(limit);
    }

    // Public profile by slug. View counter is incremented only for public visible resumes.
    // Alias /tutors/slug/{slug} keeps backward compat with old frontend tutorApi.bySlug
    @GetMapping({"/tutors/{slug:[\\p{L}0-9\\-]+-[0-9a-fA-F]{8}}", "/tutors/slug/{slug}"})
    public ResponseEntity<TutorProfileResponse> bySlug(@PathVariable String slug) {
        if ("me".equalsIgnoreCase(slug) || "resumes".equalsIgnoreCase(slug)) {
            throw ApiException.notFound("Tutor profile not found");
        }
        repository.findBySlugWithLocation(slug).ifPresent(profile -> {
            boolean isPublic = profile.getStatus() == TutorProfileStatus.PUBLISHED
                    && (profile.getExpiresAt() == null || !profile.getExpiresAt().isBefore(Instant.now()))
                    && !profile.isNoindex()
                    && (profile.getUser() == null || !profile.getUser().isBlocked());
            if (isPublic) service.incrementViews(profile.getId());
        });
        return withRobots(service.getBySlugPublic(slug));
    }

    // Spec alias: GET /api/tutors/resumes/:id (by UUID) + also slug fallback
    @GetMapping("/tutors/resumes/{id}")
    public ResponseEntity<TutorProfileResponse> byResumeId(@PathVariable String id) {
        UUID uuid;
        try {
            uuid = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return bySlug(id);
        }
        // validate public visibility before counting view (avoid counting 404s)
        var profileOpt = repository.findByIdWithLocation(uuid);
        if (profileOpt.isPresent()) {
            var prof = profileOpt.get();
            boolean isPublic = "PUBLISHED".equals(prof.getStatus().name())
                    && (prof.getExpiresAt() == null || !prof.getExpiresAt().isBefore(Instant.now()))
                    && !prof.isNoindex()
                    && (prof.getUser() == null || !prof.getUser().isBlocked());
            if (isPublic) service.incrementViews(uuid);
        }
        TutorProfileResponse resp = service.getByIdForAdmin(uuid);
        if (!"PUBLISHED".equals(resp.status())
                || (resp.expiresAt() != null && resp.expiresAt().isBefore(Instant.now()))
                || resp.noindex()) {
            throw ApiException.notFound("Tutor profile not found");
        }
        return withRobots(resp);
    }

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

    // 100% guarantee: combined status of profile + pending application
    @GetMapping({"/tutors/me/status", "/tutor-profiles/me/status"})
    public Map<String, Object> myStatus(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        var profileOpt = repository.findByUserId(principal.id());
        var out = new java.util.LinkedHashMap<String, Object>();
        if (profileOpt.isPresent()) {
            var p = profileOpt.get();
            out.put("hasProfile", true);
            out.put("profileStatus", p.getStatus().name());
            out.put("profileId", p.getId().toString());
            out.put("slug", p.getSlug());
            out.put("guaranteed", true);
        } else {
            out.put("hasProfile", false);
            out.put("profileStatus", "NONE");
            out.put("guaranteed", false);
            // check if application exists (via TutorRequestService would be separate, for now just indicate not guaranteed)
        }
        out.put("timestamp", java.time.Instant.now().toString());
        return out;
    }

    // Owner-only preview: renders the resume exactly as users see it (public form),
    // workable for any moderation status (DRAFT, PENDING_MODERATION, REJECTED, ...).
    @GetMapping({"/tutors/me/preview", "/tutor-profiles/me/preview"})
    public TutorProfileResponse preview(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.getPreviewPublic(principal.id());
    }

    @GetMapping({"/tutors/me/stats", "/tutor-profiles/me/stats"})
    public Map<String, Object> myStats(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        var profile = repository.findByUserId(principal.id()).orElse(null);
        if (profile == null) return Map.of("views", 0, "favorites", 0);
        long favCount = 0;
        try { favCount = favoriteRepository.countByTutorProfileId(profile.getId()); } catch (Exception ignored) {}
        return Map.of("views", profile.getViewsCount(), "favorites", favCount);
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

    @PostMapping({"/tutors/me/renew", "/tutor-profiles/me/renew", "/resumes/{id}/renew"})
    public TutorProfileResponse renew(@AuthenticationPrincipal UserPrincipal principal, @PathVariable(required = false) String id) {
        requireAuth(principal);
        rateLimitService.checkTutorProfileCreate(principal.id().toString());
        if (id != null) {
            try {
                UUID resumeId = UUID.fromString(id);
                var profile = repository.findById(resumeId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
                if (!profile.getUser().getId().equals(principal.id())) throw ApiException.forbidden("Not your profile");
            } catch (IllegalArgumentException ignored) {}
        }
        return service.renew(principal.id());
    }

    @PostMapping({"/tutors/me/hide", "/tutor-profiles/me/hide"})
    public TutorProfileResponse hide(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.hide(principal.id());
    }

    @PostMapping({"/tutors/me/restore", "/tutor-profiles/me/restore"})
    public TutorProfileResponse restoreOwn(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        return service.unhide(principal.id());
    }

    @PostMapping({"/resumes/{id}/publish"})
    public TutorProfileResponse publish(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        requireAuth(principal);
        rateLimitService.checkTutorProfileCreate(principal.id().toString());
        var profile = repository.findById(id).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (!profile.getUser().getId().equals(principal.id())) throw ApiException.forbidden("Not your profile");
        return service.renew(principal.id());
    }

    // ---- Фото резюме (отдельно от аватара, PROFILE kind) ----
    @org.springframework.cache.annotation.CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    @PostMapping(value = {"/tutors/me/photo", "/tutor-profiles/me/photo"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadResumePhoto(@AuthenticationPrincipal UserPrincipal principal,
                                                 @RequestParam("file") MultipartFile file) {
        requireAuth(principal);
        rateLimitService.checkTutorProfileCreate(principal.id().toString());
        var user = userService.requireById(principal.id());
        String url = mediaService.updateTutorProfilePhoto(user, file);
        // если резюме уже существует — сразу привязываем photoUrl, чтобы не требовать отдельный PUT
        repository.findByUserId(principal.id()).ifPresent(profile -> {
            profile.setPhotoUrl(url);
            repository.save(profile);
        });
        return Map.of("photoUrl", url, "photo_url", url, "url", url);
    }

    @org.springframework.cache.annotation.CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    @DeleteMapping({"/tutors/me/photo", "/tutor-profiles/me/photo"})
    public ResponseEntity<Void> deleteResumePhoto(@AuthenticationPrincipal UserPrincipal principal) {
        requireAuth(principal);
        var user = userService.requireById(principal.id());
        mediaService.deleteTutorProfilePhoto(user);
        repository.findByUserId(principal.id()).ifPresent(profile -> {
            profile.setPhotoUrl(null);
            repository.save(profile);
        });
        return ResponseEntity.noContent().build();
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
    }

    private static ResponseEntity<TutorProfileResponse> withRobots(TutorProfileResponse resp) {
        if (resp.noindex()) {
            return ResponseEntity.ok().header("X-Robots-Tag", "noindex, nofollow").body(resp);
        }
        return ResponseEntity.ok(resp);
    }
}
