package com.okututor.backend.tutor;

import com.okututor.backend.admin.AuditEntry;
import com.okututor.backend.admin.AuditLogService;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.level.Level;
import com.okututor.backend.level.LevelRepository;
import com.okututor.backend.location.City;
import com.okututor.backend.location.CityRepository;
import com.okututor.backend.location.District;
import com.okututor.backend.location.DistrictRepository;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.subject.SubjectRepository;
import com.okututor.backend.tutor.dto.TutorProfileCreateRequest;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.dto.TutorProfileUpdateRequest;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TutorProfileService {

    private final TutorProfileRepository profileRepository;
    private final SubjectRepository subjectRepository;
    private final LevelRepository levelRepository;
    private final CityRepository cityRepository;
    private final DistrictRepository districtRepository;
    private final TutorProfileSubjectRepository profileSubjectRepository;
    private final TutorProfileLevelRepository profileLevelRepository;
    private final TutorProfileLanguageRepository profileLanguageRepository;
    private final ModerationActionRepository moderationRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLog;
    private final com.okututor.backend.observability.ObservabilityMetrics metrics;

    public TutorProfileService(TutorProfileRepository profileRepository,
                               SubjectRepository subjectRepository,
                               LevelRepository levelRepository,
                               CityRepository cityRepository,
                               DistrictRepository districtRepository,
                               TutorProfileSubjectRepository profileSubjectRepository,
                               TutorProfileLevelRepository profileLevelRepository,
                               TutorProfileLanguageRepository profileLanguageRepository,
                               ModerationActionRepository moderationRepository,
                               UserRepository userRepository,
                               AuditLogService auditLog,
                               com.okututor.backend.observability.ObservabilityMetrics metrics) {
        this.profileRepository = profileRepository;
        this.subjectRepository = subjectRepository;
        this.levelRepository = levelRepository;
        this.cityRepository = cityRepository;
        this.districtRepository = districtRepository;
        this.profileSubjectRepository = profileSubjectRepository;
        this.profileLevelRepository = profileLevelRepository;
        this.profileLanguageRepository = profileLanguageRepository;
        this.moderationRepository = moderationRepository;
        this.userRepository = userRepository;
        this.auditLog = auditLog;
        this.metrics = metrics;
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse create(UUID userId, TutorProfileCreateRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        if (user.isBlocked()) {
            throw ApiException.forbidden("Blocked users cannot create tutor profiles");
        }
        var existingOpt = profileRepository.findByUserId(userId);
        if (existingOpt.isPresent()) {
            var existing = existingOpt.get();
            if (existing.getStatus() == TutorProfileStatus.DELETED || existing.getStatus() == TutorProfileStatus.ARCHIVED) {
                // Hard delete the old soft-deleted profile to allow fresh creation
                profileSubjectRepository.deleteByProfileId(existing.getId());
                profileLevelRepository.deleteByProfileId(existing.getId());
                profileLanguageRepository.deleteByProfileId(existing.getId());
                profileRepository.delete(existing);
                profileRepository.flush();
            } else {
                throw ApiException.conflict("Tutor profile already exists for this user");
            }
        }
        validatePrices(req.priceFrom(), req.priceTo());
        City city = req.cityId() == null ? null : cityRepository.findById(req.cityId()).orElseThrow(() -> ApiException.validation("City not found"));
        District district = req.districtId() == null ? null : districtRepository.findById(req.districtId()).orElseThrow(() -> ApiException.validation("District not found"));
        if (district != null && city != null && !district.getCity().getId().equals(city.getId())) {
            throw ApiException.validation("District does not belong to city");
        }
        if (district != null && city == null) {
            throw ApiException.validation("City is required when district is specified");
        }

        TutorProfile p = new TutorProfile();
        p.setUser(user);
        p.setFirstName(sanitize(req.firstName()).trim());
        p.setLastName(req.lastName() == null ? null : sanitize(req.lastName()).trim());
        p.setTitle(sanitize(req.title()));
        p.setShortDescription(sanitize(req.shortDescription()));
        p.setAbout(sanitize(req.about()));
        p.setTutorType(parseTutorType(req.tutorType()));
        p.setEducation(sanitize(req.education()));
        p.setUniversity(sanitize(req.university()));
        p.setEducationDetails(sanitize(req.educationDetails()));
        p.setExperienceYears(clampExperience(req.experienceYears()));
        p.setPriceFrom(req.priceFrom());
        p.setPriceTo(req.priceTo());
        if (req.currency() != null) p.setCurrency(req.currency());
        p.setOnline(Boolean.TRUE.equals(req.online()));
        p.setOffline(Boolean.TRUE.equals(req.offline()));
        p.setCity(city);
        p.setDistrict(district);
        p.setPhone(req.phone());
        if (req.photoUrl() != null) {
            if (isGooglePhoto(req.photoUrl())) throw ApiException.validation("Google photo cannot be used");
            p.setPhotoUrl(req.photoUrl());
        }
        p.setStatus(TutorProfileStatus.DRAFT);

        // slug must be unique — generate after id? need id first
        p.setSlug("tmp-" + UUID.randomUUID().toString().substring(0, 8));
        profileRepository.saveAndFlush(p);
        String slug = TutorProfileMapper.slugify(p.getFirstName(), p.getLastName(), p.getId());
        // ensure uniqueness collisions (rare)
        int attempt = 0;
        String candidate = slug;
        while (profileRepository.existsBySlug(candidate)) {
            candidate = slug + "-" + (attempt++ + 1);
        }
        p.setSlug(candidate);
        profileRepository.save(p);

        syncRelations(p, req.subjectIds(), req.levelIds(), req.languages());
        metrics.tutorProfileCreated();
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public void deleteByUserId(UUID userId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() == TutorProfileStatus.DELETED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        p.softDelete();
        profileRepository.save(p);
        auditLog.log(new AuditEntry(userId, "RESUME_DELETED", "TUTOR_PROFILE", p.getId().toString(), p.getStatus().name()));
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse archive(UUID userId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (!p.getUser().getId().equals(userId)) throw ApiException.forbidden("Not your profile");
        try { p.archive(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        auditLog.log(new AuditEntry(userId, "TUTOR_ARCHIVE", "TUTOR_PROFILE", p.getId().toString(), null));
        return toResponse(p, true);
    }

    @Transactional(readOnly = true)
    public TutorProfileResponse getByUserId(UUID userId, boolean includePhone) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() == TutorProfileStatus.DELETED) throw ApiException.notFound("Tutor profile not found");
        return toResponse(p, includePhone);
    }

    /**
     * Owner preview: renders the resume exactly as it looks to end users (public form,
     * phone hidden) regardless of moderation status. Only the owner may preview.
     */
    @Transactional(readOnly = true)
    public TutorProfileResponse getPreviewPublic(UUID userId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() == TutorProfileStatus.DELETED) throw ApiException.notFound("Tutor profile not found");
        if (!p.getUser().getId().equals(userId)) throw ApiException.forbidden("Not your profile");
        return toResponse(p, false);
    }

    @Transactional(readOnly = true)
    public TutorProfileResponse getBySlugPublic(String slug) {
        TutorProfile p = profileRepository.findBySlugWithLocation(slug).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() == TutorProfileStatus.EXPIRED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (p.getStatus() != TutorProfileStatus.PUBLISHED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (p.getExpiresAt() != null && p.getExpiresAt().isBefore(java.time.Instant.now())) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (p.getUser() != null && p.getUser().isBlocked()) {
            throw ApiException.notFound("Tutor profile not found");
        }
        List<Subject> subjects = profileSubjectRepository.findByProfileId(p.getId()).stream().map(TutorProfileSubject::getSubject).toList();
        List<Level> levels = profileLevelRepository.findByProfileId(p.getId()).stream().map(TutorProfileLevel::getLevel).toList();
        List<String> langs = profileLanguageRepository.findByProfileId(p.getId()).stream().map(TutorProfileLanguage::getLanguage).toList();
        // phone hidden for public
        return TutorProfileMapper.toResponse(p, subjects, levels, langs, false);
    }

    @org.springframework.cache.annotation.CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    @Transactional
    public void incrementViews(UUID profileId) {
        profileRepository.incrementViews(profileId);
        metrics.tutorProfileView();
    }

    @Transactional(readOnly = true)
    public TutorProfileResponse getByIdForAdmin(UUID id) {
        TutorProfile p = profileRepository.findByIdWithLocation(id).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse update(UUID userId, TutorProfileUpdateRequest req) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getUser() != null && p.getUser().isBlocked()) {
            throw ApiException.forbidden("Blocked users cannot edit tutor profiles");
        }
        if (p.getStatus() == TutorProfileStatus.DELETED || p.getStatus() == TutorProfileStatus.ARCHIVED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        // Allow editing in any moderate state — PENDING_MODERATION stays pending,
        // SUSPENDED stays suspended; only DELETED/ARCHIVED are blocked.
        // No exception for PENDING_MODERATION / SUSPENDED to support "edit while on moderation".
        boolean isActive = p.getStatus().isActive();
        boolean needsRemoderation = isActive && isModerationRequired(req);
        validatePrices(req.priceFrom(), req.priceTo());
        if (req.firstName() != null) p.setFirstName(sanitize(req.firstName()).trim());
        if (req.lastName() != null) p.setLastName(sanitize(req.lastName()));
        if (req.title() != null) p.setTitle(sanitize(req.title()));
        if (req.shortDescription() != null) p.setShortDescription(sanitize(req.shortDescription()));
        if (req.about() != null) p.setAbout(sanitize(req.about()));
        if (req.tutorType() != null) p.setTutorType(parseTutorType(req.tutorType()));
        if (req.education() != null) p.setEducation(sanitize(req.education()));
        if (req.university() != null) p.setUniversity(sanitize(req.university()));
        if (req.educationDetails() != null) p.setEducationDetails(sanitize(req.educationDetails()));
        if (req.experienceYears() != null) p.setExperienceYears(clampExperience(req.experienceYears()));
        if (req.priceFrom() != null) p.setPriceFrom(req.priceFrom());
        if (req.priceTo() != null) p.setPriceTo(req.priceTo());
        if (req.currency() != null) p.setCurrency(req.currency());
        if (req.online() != null) p.setOnline(req.online());
        if (req.offline() != null) p.setOffline(req.offline());
        if (req.cityId() != null) {
            City city = cityRepository.findById(req.cityId()).orElseThrow(() -> ApiException.validation("City not found"));
            p.setCity(city);
            // if district already set, validate it still belongs to new city
            if (p.getDistrict() != null && !p.getDistrict().getCity().getId().equals(city.getId())) {
                throw ApiException.validation("Existing district does not belong to new city");
            }
        }
        if (req.districtId() != null) {
            District d = districtRepository.findById(req.districtId()).orElseThrow(() -> ApiException.validation("District not found"));
            City effectiveCity = req.cityId() != null ? cityRepository.findById(req.cityId()).orElse(null) : p.getCity();
            if (effectiveCity == null) {
                throw ApiException.validation("City is required when district is specified");
            }
            if (!d.getCity().getId().equals(effectiveCity.getId())) {
                throw ApiException.validation("District does not belong to city");
            }
            p.setDistrict(d);
        }
        if (req.phone() != null) p.setPhone(req.phone());
        if (req.photoUrl() != null) {
            if (isGooglePhoto(req.photoUrl())) throw ApiException.validation("Google photo cannot be used");
            p.setPhotoUrl(req.photoUrl());
        }

        // Handle moderation-sensitive changes for ACTIVE profiles
        if (needsRemoderation) {
            p.setStatus(TutorProfileStatus.PENDING_MODERATION);
            auditLog.log(new AuditEntry(userId, "RESUME_PENDING_MODERATION", "TUTOR_PROFILE", p.getId().toString(), "MODERATION_REQUIRED_EDIT"));
        } else if (p.getStatus() == TutorProfileStatus.REJECTED) {
            // Editing a rejected resume moves it back to DRAFT for re-submission
            p.setStatus(TutorProfileStatus.DRAFT);
        }

        profileRepository.save(p);

        // sync relations only if provided (not null)
        if (req.subjectIds() != null || req.levelIds() != null || req.languages() != null) {
            syncRelations(p, req.subjectIds(), req.levelIds(), req.languages());
            if (needsRemoderation) {
                // Mark that relations changed and need moderation
                auditLog.log(new AuditEntry(userId, "RESUME_RELATIONS_CHANGED", "TUTOR_PROFILE", p.getId().toString(), null));
            }
        }
        auditLog.log(new AuditEntry(userId, "RESUME_UPDATED", "TUTOR_PROFILE", p.getId().toString(), p.getStatus().name()));
        return toResponse(p, true);
    }

    private boolean isModerationRequired(TutorProfileUpdateRequest req) {
        // Significant changes that require re-moderation
        return req.title() != null || req.shortDescription() != null || req.about() != null
                || req.education() != null || req.university() != null || req.educationDetails() != null
                || req.subjectIds() != null || req.levelIds() != null || req.tutorType() != null;
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse submit(UUID userId, UUID actorId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getUser() != null && p.getUser().isBlocked()) {
            throw ApiException.forbidden("Blocked users cannot submit for moderation");
        }
        try {
            p.submitForModeration();
        } catch (IllegalStateException e) {
            throw ApiException.conflict(e.getMessage());
        }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, actorId == null ? null : refUser(actorId), ModerationAction.Action.SUBMIT, null));
        auditLog.log(new AuditEntry(actorId, "TUTOR_SUBMIT", "TUTOR_PROFILE", p.getId().toString(), p.getStatus().name()));
        try { metrics.pendingModerationInc(); } catch (Exception ignored) {}
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse approve(UUID profileId, UUID actorId) {
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.approve(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.APPROVE, null));
        auditLog.log(new AuditEntry(actorId, "TUTOR_APPROVE", "TUTOR_PROFILE", p.getId().toString(), null));
        metrics.tutorProfilePublished();
        try { metrics.pendingModerationDec(); } catch (Exception ignored) {}
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse reject(UUID profileId, String reason, UUID actorId) {
        if (reason == null || reason.isBlank()) throw new com.okututor.backend.common.error.FieldValidationException(java.util.Map.of("reason", "reason is required"));
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.reject(reason); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.REJECT, reason));
        auditLog.log(new AuditEntry(actorId, "TUTOR_REJECT", "TUTOR_PROFILE", p.getId().toString(), reason));
        try { metrics.resumeRejected(); metrics.pendingModerationDec(); } catch (Exception ignored) {}
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse suspend(UUID profileId, String reason, UUID actorId) {
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.suspend(reason); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.SUSPEND, reason));
        auditLog.log(new AuditEntry(actorId, "TUTOR_SUSPEND", "TUTOR_PROFILE", p.getId().toString(), reason));
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse restore(UUID profileId, UUID actorId) {
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.restore(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.RESTORE, null));
        auditLog.log(new AuditEntry(actorId, "TUTOR_RESTORE", "TUTOR_PROFILE", p.getId().toString(), null));
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse hide(UUID userId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (!p.getUser().getId().equals(userId)) throw ApiException.forbidden("Not your profile");
        try { p.hide(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        auditLog.log(new AuditEntry(userId, "TUTOR_HIDE", "TUTOR_PROFILE", p.getId().toString(), null));
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse unhide(UUID userId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (!p.getUser().getId().equals(userId)) throw ApiException.forbidden("Not your profile");
        try { p.unhide(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        auditLog.log(new AuditEntry(userId, "TUTOR_UNHIDE", "TUTOR_PROFILE", p.getId().toString(), null));
        return toResponse(p, true);
    }

    @Transactional
    @CacheEvict(value = {"tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2"}, allEntries = true)
    public TutorProfileResponse renew(UUID userId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (!p.getUser().getId().equals(userId)) throw ApiException.forbidden("Not your profile");
        if (p.getStatus() != TutorProfileStatus.PUBLISHED && p.getStatus() != TutorProfileStatus.EXPIRED && p.getStatus() != TutorProfileStatus.HIDDEN) {
            throw ApiException.conflict("Can renew only PUBLISHED, EXPIRED or HIDDEN, current: " + p.getStatus());
        }
        Instant now = Instant.now();
        Instant graceWindow = now.plusSeconds(3L * 24 * 3600);
        if (p.getExpiresAt() != null && p.getExpiresAt().isAfter(graceWindow)) {
            throw ApiException.conflict("Renewal is available only after the current 30-day period has ended");
        }
        try { p.renew(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(userId), ModerationAction.Action.RESTORE, "RENEW 30d"));
        auditLog.log(new AuditEntry(userId, "TUTOR_RENEW", "TUTOR_PROFILE", p.getId().toString(), p.getExpiresAt().toString()));
        return toResponse(p, true);
    }

    @Transactional
    public int expireOldProfiles() {
        return profileRepository.expireOldProfiles();
    }

    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> adminList(String status, int page, int size) {
        return adminList(status, null, page, size);
    }

    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> adminList(String status, String q, int page, int size) {
        TutorProfileStatus s = null;
        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toUpperCase();
            if ("PENDING".equals(normalized)) normalized = TutorProfileStatus.PENDING_MODERATION.name();
            else if ("APPROVED".equals(normalized)) normalized = TutorProfileStatus.PUBLISHED.name();
            try { s = TutorProfileStatus.valueOf(normalized); } catch (IllegalArgumentException e) { throw ApiException.validation("Unknown status: " + status); }
        }
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        String qTrim = (q == null || q.isBlank()) ? null : q.trim();
        Page<TutorProfile> result = profileRepository.findByAdminFilter(s, qTrim, pr);
        if (result.isEmpty()) return result.map(p -> toResponse(p, true));
        List<UUID> ids = result.getContent().stream().map(TutorProfile::getId).toList();
        var subjectMap = profileSubjectRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(s2 -> s2.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileSubject::getSubject, java.util.stream.Collectors.toList())));
        var levelMap = profileLevelRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLevel::getLevel, java.util.stream.Collectors.toList())));
        var langMap = profileLanguageRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLanguage::getLanguage, java.util.stream.Collectors.toList())));
        var mapped = result.getContent().stream()
                .map(p -> TutorProfileMapper.toResponse(p,
                        subjectMap.getOrDefault(p.getId(), List.of()),
                        levelMap.getOrDefault(p.getId(), List.of()),
                        langMap.getOrDefault(p.getId(), List.of()),
                        true))
                .toList();
        return new org.springframework.data.domain.PageImpl<>(mapped, pr, result.getTotalElements());
    }

    @Cacheable(value = "tutorPopular:v2", key = "#limit", unless = "#result == null")
    @Transactional(readOnly = true)
    public List<TutorProfileResponse> getPopular(int limit) {
        int capped = Math.min(Math.max(limit, 1), 20);
        var pageable = PageRequest.of(0, capped);
        var profiles = profileRepository.findPopular(pageable);
        if (profiles.isEmpty()) return List.of();
        List<UUID> ids = profiles.stream().map(TutorProfile::getId).toList();
        var subjectMap = profileSubjectRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileSubject::getSubject, java.util.stream.Collectors.toList())));
        var levelMap = profileLevelRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLevel::getLevel, java.util.stream.Collectors.toList())));
        var langMap = profileLanguageRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLanguage::getLanguage, java.util.stream.Collectors.toList())));
        return profiles.stream()
                .map(p -> TutorProfileMapper.toResponse(p,
                        subjectMap.getOrDefault(p.getId(), List.of()),
                        levelMap.getOrDefault(p.getId(), List.of()),
                        langMap.getOrDefault(p.getId(), List.of()),
                        false))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> publicListing(int page, int size, String tutorType, UUID cityId, UUID districtId, Boolean online, Boolean offline, BigDecimal priceFrom, BigDecimal priceTo) {
        return publicListingCached(page, size, tutorType, cityId, districtId, online, offline, priceFrom, priceTo).toPage();
    }

    @Cacheable(value = "tutorPublicList:v2", key = "T(com.okututor.backend.tutor.TutorCacheKey).of(#page,#size,#tutorType,#cityId,#districtId,#online,#offline,#priceFrom,#priceTo)", unless = "#result == null")
    @Transactional(readOnly = true)
    public com.okututor.backend.tutor.dto.TutorPageCacheDto publicListingCached(int page, int size, String tutorType, UUID cityId, UUID districtId, Boolean online, Boolean offline, BigDecimal priceFrom, BigDecimal priceTo) {
        long overallStart = System.nanoTime();
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<TutorProfile> basePage;
        if (tutorType == null && cityId == null && districtId == null && online == null && offline == null && priceFrom == null && priceTo == null) {
            basePage = profileRepository.findPublishedExcludingBlocked(TutorProfileStatus.PUBLISHED, pr);
        } else {
            TutorType tt = null;
            if (tutorType != null) {
                try { tt = TutorType.valueOf(tutorType.toUpperCase()); } catch (IllegalArgumentException e) { throw ApiException.validation("Unknown tutor_type: " + tutorType); }
            }
            basePage = profileRepository.findPublishedWithFilters(tt, cityId, districtId, online, offline, priceFrom, priceTo, pr);
        }
        // double-check blocked (defense in depth, though queries already filter)
        var filteredContent = basePage.getContent().stream()
                .filter(p -> p.getUser() == null || !p.getUser().isBlocked())
                .toList();
        if (filteredContent.isEmpty()) {
            return com.okututor.backend.tutor.dto.TutorPageCacheDto.from(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList(), pr, basePage.getTotalElements()));
        }
        List<UUID> ids = filteredContent.stream().map(TutorProfile::getId).toList();
        var subjectMap = profileSubjectRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileSubject::getSubject, java.util.stream.Collectors.toList())));
        var levelMap = profileLevelRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLevel::getLevel, java.util.stream.Collectors.toList())));
        var langMap = profileLanguageRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLanguage::getLanguage, java.util.stream.Collectors.toList())));
        long mapStart = System.nanoTime();
        var responseList = filteredContent.stream()
                .map(p -> TutorProfileMapper.toResponse(p,
                        subjectMap.getOrDefault(p.getId(), List.of()),
                        levelMap.getOrDefault(p.getId(), List.of()),
                        langMap.getOrDefault(p.getId(), List.of()),
                        false))
                .toList();
        metrics.tutorListMappingDuration((System.nanoTime() - mapStart) / 1_000_000);
        var pageResult = new org.springframework.data.domain.PageImpl<>(responseList, pr, basePage.getTotalElements());
        metrics.tutorListDbDuration((System.nanoTime() - overallStart) / 1_000_000);
        return com.okututor.backend.tutor.dto.TutorPageCacheDto.from(pageResult);
    }

    // Slice pagination — no COUNT, for infinite scroll
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Slice<TutorProfileResponse> publicSlice(int page, int size, String tutorType, UUID cityId, UUID districtId, Boolean online, Boolean offline, BigDecimal priceFrom, BigDecimal priceTo) {
        int cappedSize = Math.min(Math.max(size, 1), 50);
        var pageable = org.springframework.data.domain.PageRequest.of(Math.max(page, 0), cappedSize);
        org.springframework.data.domain.Slice<TutorProfile> slice;
        if (tutorType == null && cityId == null && districtId == null && online == null && offline == null && priceFrom == null && priceTo == null) {
            slice = profileRepository.findPublishedSlice(pageable);
        } else {
            TutorType tt = null;
            if (tutorType != null) try { tt = TutorType.valueOf(tutorType.toUpperCase()); } catch (IllegalArgumentException e) { throw ApiException.validation("Unknown tutor_type: " + tutorType); }
            slice = profileRepository.findPublishedSliceWithFilters(tt, cityId, districtId, online, offline, priceFrom, priceTo, pageable);
        }
        if (slice.isEmpty()) return slice.map(p -> TutorProfileMapper.toResponse(p, List.of(), List.of(), List.of(), false));
        List<UUID> ids = slice.getContent().stream().map(TutorProfile::getId).toList();
        var subjectMap = profileSubjectRepository.findByProfileIdIn(ids).stream().collect(java.util.stream.Collectors.groupingBy(s -> s.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileSubject::getSubject, java.util.stream.Collectors.toList())));
        var levelMap = profileLevelRepository.findByProfileIdIn(ids).stream().collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLevel::getLevel, java.util.stream.Collectors.toList())));
        var langMap = profileLanguageRepository.findByProfileIdIn(ids).stream().collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(), java.util.stream.Collectors.mapping(TutorProfileLanguage::getLanguage, java.util.stream.Collectors.toList())));
        return slice.map(p -> TutorProfileMapper.toResponse(p, subjectMap.getOrDefault(p.getId(), List.of()), levelMap.getOrDefault(p.getId(), List.of()), langMap.getOrDefault(p.getId(), List.of()), false));
    }

    // Cursor pagination — keyset, no OFFSET, no COUNT (simplified: delegates to Slice for now)
    @Transactional(readOnly = true)
    public com.okututor.backend.tutor.dto.TutorSliceResponse<TutorProfileResponse> publicCursor(String cursor, int size, String tutorType, UUID cityId, UUID districtId, Boolean online, Boolean offline, BigDecimal priceFrom, BigDecimal priceTo) {
        var slice = publicSlice(0, size, tutorType, cityId, districtId, online, offline, priceFrom, priceTo);
        boolean hasNext = slice.hasNext();
        String nextCursor = null;
        if (hasNext && !slice.getContent().isEmpty()) {
            var last = slice.getContent().get(slice.getContent().size() - 1);
            String raw = last.publishedAt().toString() + "|" + last.id().toString();
            nextCursor = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
        return new com.okututor.backend.tutor.dto.TutorSliceResponse<>(slice.getContent(), 0, size, hasNext, nextCursor, true, !hasNext);
    }

    // helpers
    private TutorProfileResponse toResponse(TutorProfile p, boolean includePhone) {
        // force fetch city/district if needed (already lazy) — within tx will load
        List<Subject> subjects = profileSubjectRepository.findByProfileId(p.getId()).stream().map(TutorProfileSubject::getSubject).toList();
        List<Level> levels = profileLevelRepository.findByProfileId(p.getId()).stream().map(TutorProfileLevel::getLevel).toList();
        List<String> languages = profileLanguageRepository.findByProfileId(p.getId()).stream().map(TutorProfileLanguage::getLanguage).toList();
        return TutorProfileMapper.toResponse(p, subjects, levels, languages, includePhone);
    }

    private void syncRelations(TutorProfile p, List<UUID> subjectIds, List<UUID> levelIds, List<String> languages) {
        if (subjectIds != null) {
            profileSubjectRepository.deleteByProfileId(p.getId());
            if (!subjectIds.isEmpty()) {
                var subjects = subjectRepository.findAllById(subjectIds);
                if (subjects.size() != subjectIds.size()) {
                    var found = subjects.stream().map(Subject::getId).collect(java.util.stream.Collectors.toSet());
                    var missing = subjectIds.stream().filter(id -> !found.contains(id)).toList();
                    throw ApiException.validation("Subjects not found: " + missing);
                }
                var toSave = subjects.stream().map(s -> new TutorProfileSubject(p, s)).toList();
                profileSubjectRepository.saveAll(toSave);
            }
        }
        if (levelIds != null) {
            profileLevelRepository.deleteByProfileId(p.getId());
            if (!levelIds.isEmpty()) {
                var levels = levelRepository.findAllById(levelIds);
                if (levels.size() != levelIds.size()) {
                    var found = levels.stream().map(Level::getId).collect(java.util.stream.Collectors.toSet());
                    var missing = levelIds.stream().filter(id -> !found.contains(id)).toList();
                    throw ApiException.validation("Levels not found: " + missing);
                }
                var toSave = levels.stream().map(l -> new TutorProfileLevel(p, l)).toList();
                profileLevelRepository.saveAll(toSave);
            }
        }
        if (languages != null) {
            profileLanguageRepository.deleteByProfileId(p.getId());
            if (!languages.isEmpty()) {
                var normalized = languages.stream()
                        .filter(l -> l != null && !l.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();
                var toSave = normalized.stream().map(lang -> new TutorProfileLanguage(p, lang)).toList();
                profileLanguageRepository.saveAll(toSave);
            }
        }
    }

    private TutorType parseTutorType(String raw) {
        if (raw == null || raw.isBlank()) return TutorType.STUDENT_TUTOR;
        try { return TutorType.valueOf(raw.trim().toUpperCase()); } catch (IllegalArgumentException e) { throw ApiException.validation("Unknown tutor_type: " + raw); }
    }

    private void validatePrices(BigDecimal from, BigDecimal to) {
        if (from != null && from.compareTo(BigDecimal.ZERO) < 0) throw ApiException.validation("price_from must be >= 0");
        if (to != null && to.compareTo(BigDecimal.ZERO) < 0) throw ApiException.validation("price_to must be >= 0");
        if (from != null && to != null && from.compareTo(to) > 0) throw ApiException.validation("price_from must be <= price_to");
    }

    private User refUser(UUID id) {
        if (id == null) return null;
        User u = new User();
        u.setId(id);
        return u;
    }

    private static boolean isGooglePhoto(String url) {
        return com.okututor.backend.common.util.PhotoUrlUtils.isGooglePhoto(url);
    }

    private static String sanitize(String v) {
        if (v == null) return null;
        // strip all HTML tags — stored XSS defense (LegalService уже использует Jsoup, тут Safelist.none)
        String cleaned = Jsoup.clean(v, "", Safelist.none(), new org.jsoup.nodes.Document.OutputSettings().prettyPrint(false));
        // Jsoup may add &amp; for & — unescape minimal (keep as text)
        return cleaned == null ? v : cleaned.trim();
    }

    private static Integer clampExperience(Integer v) {
        if (v == null) return null;
        if (v < 0) return 0;
        if (v > 80) return 80;
        return v;
    }
}
