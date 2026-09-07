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
import java.util.List;
import java.util.UUID;
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
                               AuditLogService auditLog) {
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
    }

    @Transactional
    public TutorProfileResponse create(UUID userId, TutorProfileCreateRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        if (profileRepository.existsByUserId(userId)) {
            throw ApiException.conflict("Tutor profile already exists for this user");
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
        p.setFirstName(req.firstName().trim());
        p.setLastName(req.lastName() == null ? null : req.lastName().trim());
        p.setTitle(req.title());
        p.setShortDescription(req.shortDescription());
        p.setAbout(req.about());
        p.setTutorType(parseTutorType(req.tutorType()));
        p.setEducation(req.education());
        p.setUniversity(req.university());
        p.setEducationDetails(req.educationDetails());
        p.setExperienceYears(req.experienceYears());
        p.setPriceFrom(req.priceFrom());
        p.setPriceTo(req.priceTo());
        if (req.currency() != null) p.setCurrency(req.currency());
        p.setOnline(Boolean.TRUE.equals(req.online()));
        p.setOffline(Boolean.TRUE.equals(req.offline()));
        p.setCity(city);
        p.setDistrict(district);
        p.setPhone(req.phone());
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
        return toResponse(p, true);
    }

    @Transactional(readOnly = true)
    public TutorProfileResponse getByUserId(UUID userId, boolean includePhone) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        // need to fetch city/district lazily within tx
        p.getCity(); // trigger? will be handled in mapper with fetch? we use repository with fetch for public, but for owner we need manual
        return toResponse(p, includePhone);
    }

    @Transactional(readOnly = true)
    public TutorProfileResponse getBySlugPublic(String slug) {
        TutorProfile p = profileRepository.findBySlugWithLocation(slug).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() != TutorProfileStatus.PUBLISHED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        List<Subject> subjects = profileSubjectRepository.findByProfileId(p.getId()).stream().map(TutorProfileSubject::getSubject).toList();
        List<Level> levels = profileLevelRepository.findByProfileId(p.getId()).stream().map(TutorProfileLevel::getLevel).toList();
        List<String> langs = profileLanguageRepository.findByProfileId(p.getId()).stream().map(TutorProfileLanguage::getLanguage).toList();
        // phone hidden for public
        return TutorProfileMapper.toResponse(p, subjects, levels, langs, false);
    }

    @Transactional
    public void incrementViews(UUID profileId) {
        profileRepository.incrementViews(profileId);
    }

    @Transactional(readOnly = true)
    public TutorProfileResponse getByIdForAdmin(UUID id) {
        TutorProfile p = profileRepository.findByIdWithLocation(id).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        return toResponse(p, true);
    }

    @Transactional
    public TutorProfileResponse update(UUID userId, TutorProfileUpdateRequest req) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() != TutorProfileStatus.DRAFT && p.getStatus() != TutorProfileStatus.REJECTED) {
            throw ApiException.conflict("Can edit only in DRAFT or REJECTED, current: " + p.getStatus());
        }
        validatePrices(req.priceFrom(), req.priceTo());
        if (req.firstName() != null) p.setFirstName(req.firstName().trim());
        if (req.lastName() != null) p.setLastName(req.lastName());
        if (req.title() != null) p.setTitle(req.title());
        if (req.shortDescription() != null) p.setShortDescription(req.shortDescription());
        if (req.about() != null) p.setAbout(req.about());
        if (req.tutorType() != null) p.setTutorType(parseTutorType(req.tutorType()));
        if (req.education() != null) p.setEducation(req.education());
        if (req.university() != null) p.setUniversity(req.university());
        if (req.educationDetails() != null) p.setEducationDetails(req.educationDetails());
        if (req.experienceYears() != null) p.setExperienceYears(req.experienceYears());
        if (req.priceFrom() != null) p.setPriceFrom(req.priceFrom());
        if (req.priceTo() != null) p.setPriceTo(req.priceTo());
        if (req.currency() != null) p.setCurrency(req.currency());
        if (req.online() != null) p.setOnline(req.online());
        if (req.offline() != null) p.setOffline(req.offline());
        if (req.cityId() != null) {
            City city = cityRepository.findById(req.cityId()).orElseThrow(() -> ApiException.validation("City not found"));
            p.setCity(city);
        }
        if (req.districtId() != null) {
            District d = districtRepository.findById(req.districtId()).orElseThrow(() -> ApiException.validation("District not found"));
            p.setDistrict(d);
        }
        // allow clearing city/district? if explicit null not sent we keep. If cityId is sent as null we keep old. To clear, frontend should send? keep simple.
        if (req.phone() != null) p.setPhone(req.phone());

        profileRepository.save(p);

        // sync relations only if provided (not null)
        if (req.subjectIds() != null || req.levelIds() != null || req.languages() != null) {
            syncRelations(p, req.subjectIds(), req.levelIds(), req.languages());
        }
        return toResponse(p, true);
    }

    @Transactional
    public TutorProfileResponse submit(UUID userId, UUID actorId) {
        TutorProfile p = profileRepository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try {
            p.submitForModeration();
        } catch (IllegalStateException e) {
            throw ApiException.conflict(e.getMessage());
        }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, actorId == null ? null : refUser(actorId), ModerationAction.Action.SUBMIT, null));
        auditLog.log(new AuditEntry(actorId, "TUTOR_SUBMIT", "TUTOR_PROFILE", p.getId().toString(), p.getStatus().name()));
        return toResponse(p, true);
    }

    @Transactional
    public TutorProfileResponse approve(UUID profileId, UUID actorId) {
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.approve(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.APPROVE, null));
        auditLog.log(new AuditEntry(actorId, "TUTOR_APPROVE", "TUTOR_PROFILE", p.getId().toString(), null));
        return toResponse(p, true);
    }

    @Transactional
    public TutorProfileResponse reject(UUID profileId, String reason, UUID actorId) {
        if (reason == null || reason.isBlank()) throw new com.okututor.backend.common.error.FieldValidationException(java.util.Map.of("reason", "reason is required"));
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.reject(reason); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.REJECT, reason));
        auditLog.log(new AuditEntry(actorId, "TUTOR_REJECT", "TUTOR_PROFILE", p.getId().toString(), reason));
        return toResponse(p, true);
    }

    @Transactional
    public TutorProfileResponse suspend(UUID profileId, String reason, UUID actorId) {
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.suspend(reason); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.SUSPEND, reason));
        auditLog.log(new AuditEntry(actorId, "TUTOR_SUSPEND", "TUTOR_PROFILE", p.getId().toString(), reason));
        return toResponse(p, true);
    }

    @Transactional
    public TutorProfileResponse restore(UUID profileId, UUID actorId) {
        TutorProfile p = profileRepository.findById(profileId).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        try { p.restore(); } catch (IllegalStateException e) { throw ApiException.conflict(e.getMessage()); }
        profileRepository.save(p);
        moderationRepository.save(new ModerationAction(p, refUser(actorId), ModerationAction.Action.RESTORE, null));
        auditLog.log(new AuditEntry(actorId, "TUTOR_RESTORE", "TUTOR_PROFILE", p.getId().toString(), null));
        return toResponse(p, true);
    }

    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> adminList(String status, int page, int size) {
        TutorProfileStatus s = null;
        if (status != null && !status.isBlank()) {
            try { s = TutorProfileStatus.valueOf(status.toUpperCase()); } catch (IllegalArgumentException e) { throw ApiException.validation("Unknown status: " + status); }
        }
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<TutorProfile> result = s == null ? profileRepository.findAll(pr) : profileRepository.findByStatusOrderByPublishedAtDesc(s, pr);
        return result.map(p -> toResponse(p, true));
    }

    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> publicListing(int page, int size, String tutorType, UUID cityId, UUID districtId, Boolean online, Boolean offline, BigDecimal priceFrom, BigDecimal priceTo) {
        // simple path without search — uses findPublishedWithFilters if any filter present else findByStatus
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        if (tutorType == null && cityId == null && districtId == null && online == null && offline == null && priceFrom == null && priceTo == null) {
            Page<TutorProfile> base = profileRepository.findByStatusOrderByPublishedAtDesc(TutorProfileStatus.PUBLISHED, pr);
            return base.map(p -> {
                List<Subject> subs = profileSubjectRepository.findByProfileId(p.getId()).stream().map(TutorProfileSubject::getSubject).toList();
                List<Level> levs = profileLevelRepository.findByProfileId(p.getId()).stream().map(TutorProfileLevel::getLevel).toList();
                List<String> langs = profileLanguageRepository.findByProfileId(p.getId()).stream().map(TutorProfileLanguage::getLanguage).toList();
                return TutorProfileMapper.toResponse(p, subs, levs, langs, false);
            });
        }
        TutorType tt = null;
        if (tutorType != null) {
            try { tt = TutorType.valueOf(tutorType.toUpperCase()); } catch (IllegalArgumentException e) { throw ApiException.validation("Unknown tutor_type: " + tutorType); }
        }
        Page<TutorProfile> filtered = profileRepository.findPublishedWithFilters(tt, cityId, districtId, online, offline, priceFrom, priceTo, pr);
        return filtered.map(p -> {
            List<Subject> subs = profileSubjectRepository.findByProfileId(p.getId()).stream().map(TutorProfileSubject::getSubject).toList();
            List<Level> levs = profileLevelRepository.findByProfileId(p.getId()).stream().map(TutorProfileLevel::getLevel).toList();
            List<String> langs = profileLanguageRepository.findByProfileId(p.getId()).stream().map(TutorProfileLanguage::getLanguage).toList();
            return TutorProfileMapper.toResponse(p, subs, levs, langs, false);
        });
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
            for (UUID sid : subjectIds) {
                Subject s = subjectRepository.findById(sid).orElseThrow(() -> ApiException.validation("Subject not found: " + sid));
                profileSubjectRepository.save(new TutorProfileSubject(p, s));
            }
        }
        if (levelIds != null) {
            profileLevelRepository.deleteByProfileId(p.getId());
            for (UUID lid : levelIds) {
                Level l = levelRepository.findById(lid).orElseThrow(() -> ApiException.validation("Level not found: " + lid));
                profileLevelRepository.save(new TutorProfileLevel(p, l));
            }
        }
        if (languages != null) {
            profileLanguageRepository.deleteByProfileId(p.getId());
            for (String lang : languages) {
                if (lang == null || lang.isBlank()) continue;
                profileLanguageRepository.save(new TutorProfileLanguage(p, lang.trim()));
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
}
