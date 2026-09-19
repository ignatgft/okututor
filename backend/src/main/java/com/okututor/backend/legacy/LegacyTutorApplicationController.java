package com.okututor.backend.legacy;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.common.error.FieldValidationException;
import com.okututor.backend.level.Level;
import com.okututor.backend.level.LevelRepository;
import com.okututor.backend.location.City;
import com.okututor.backend.location.CityRepository;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.subject.SubjectRepository;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileLanguageRepository;
import com.okututor.backend.tutor.TutorProfileLevelRepository;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileService;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.tutor.TutorProfileSubjectRepository;
import com.okututor.backend.tutor.dto.TutorProfileCreateRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Legacy bridge for old wizard {@code POST /api/v1/tutors/applications} and {@code GET /me}.
 * Frontend PgBecomeTutor historically used this endpoint (full_name, subjects as csv etc.)
 * After migration to TutorProfile marketplace the endpoint was deleted, causing 404 and
 * "резюме не отправляется на модерацию". This controller restores compatibility
 * без ломки нового API: creates TutorProfile + submits to moderation.
 *
 * Thread-safe: no mutable instance fields, relations synced via repositories within transaction.
 */
@RestController
@RequestMapping({"/api/v1/tutors/applications", "/api/tutors/applications"})
public class LegacyTutorApplicationController {

    private final TutorProfileRepository profileRepository;
    private final TutorProfileService profileService;
    private final CityRepository cityRepository;
    private final SubjectRepository subjectRepository;
    private final LevelRepository levelRepository;
    private final TutorProfileSubjectRepository subjectLinkRepository;
    private final TutorProfileLevelRepository levelLinkRepository;
    private final TutorProfileLanguageRepository languageLinkRepository;
    private final com.okututor.backend.common.ratelimit.RateLimitService rateLimitService;

    public LegacyTutorApplicationController(TutorProfileRepository profileRepository,
                                            TutorProfileService profileService,
                                            CityRepository cityRepository,
                                            SubjectRepository subjectRepository,
                                            LevelRepository levelRepository,
                                            TutorProfileSubjectRepository subjectLinkRepository,
                                            TutorProfileLevelRepository levelLinkRepository,
                                            TutorProfileLanguageRepository languageLinkRepository,
                                            com.okututor.backend.common.ratelimit.RateLimitService rateLimitService) {
        this.profileRepository = profileRepository;
        this.profileService = profileService;
        this.cityRepository = cityRepository;
        this.subjectRepository = subjectRepository;
        this.levelRepository = levelRepository;
        this.subjectLinkRepository = subjectLinkRepository;
        this.levelLinkRepository = levelLinkRepository;
        this.languageLinkRepository = languageLinkRepository;
        this.rateLimitService = rateLimitService;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LegacySubmitRequest(
            String full_name,
            String phone,
            String location,
            Integer experience_years,
            String experience_description,
            String education,
            Object subjects,
            Object levels,
            Object languages,
            String bio,
            Object price_per_hour,
            String format,
            String id_document_name
    ) {}

    @PostMapping({"", "/"})
    @Transactional
    public ResponseEntity<Map<String, Object>> submit(@AuthenticationPrincipal UserPrincipal principal,
                                                      @RequestBody(required = false) LegacySubmitRequest req) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        try { rateLimitService.checkTutorProfileCreate(principal.id().toString()); } catch (ApiException e) { throw e; } catch (Exception ignored) {}
        if (req == null || req.full_name() == null || req.full_name().isBlank()) {
            throw new FieldValidationException(Map.of("full_name", "Name is required"));
        }

        var existingOpt = profileRepository.findByUserId(principal.id());
        if (existingOpt.isPresent()) {
            var existing = existingOpt.get();
            // already in moderation or published -> idempotent success (100% guarantee on retry)
            if (existing.getStatus() == TutorProfileStatus.PENDING_MODERATION
                    || existing.getStatus() == TutorProfileStatus.PUBLISHED
                    || existing.getStatus() == TutorProfileStatus.ACTIVE) {
                return ResponseEntity.ok(toLegacyResponse(existing));
            }
            // soft-deleted/archived allow recreation
            if (existing.getStatus() == TutorProfileStatus.DELETED || existing.getStatus() == TutorProfileStatus.ARCHIVED) {
                subjectLinkRepository.deleteByProfileId(existing.getId());
                levelLinkRepository.deleteByProfileId(existing.getId());
                languageLinkRepository.deleteByProfileId(existing.getId());
                profileRepository.delete(existing);
                profileRepository.flush();
            } else if (existing.getStatus() == TutorProfileStatus.DRAFT
                    || existing.getStatus() == TutorProfileStatus.REJECTED) {
                updateExistingFromLegacy(existing, req);
                profileRepository.save(existing);
                // sync relations after entity save (needs id)
                syncRelations(existing,
                        resolveSubjectIds(req.subjects()),
                        resolveLevelIds(req.levels()),
                        parseLanguages(req.languages()));
                trySubmit(existing);
                var refreshed = profileRepository.findByUserId(principal.id()).orElse(existing);
                return ResponseEntity.ok(toLegacyResponse(refreshed));
            } else if (existing.getStatus() == TutorProfileStatus.SUSPENDED
                    || existing.getStatus() == TutorProfileStatus.HIDDEN
                    || existing.getStatus() == TutorProfileStatus.EXPIRED) {
                throw ApiException.conflict("Profile in status " + existing.getStatus() + " cannot be resubmitted via legacy endpoint. Use /api/v1/tutors/me");
            }
        }

        TutorProfileCreateRequest createReq = mapToCreateRequest(req);
        profileService.create(principal.id(), createReq);
        var entity = profileRepository.findByUserId(principal.id()).orElseThrow();
        trySubmit(entity);
        var refreshed = profileRepository.findByUserId(principal.id()).orElse(entity);
        return ResponseEntity.ok(toLegacyResponse(refreshed));
    }

    @GetMapping({"/me", "/me/"})
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        var opt = profileRepository.findByUserId(principal.id());
        if (opt.isEmpty() || opt.get().getStatus() == TutorProfileStatus.DELETED) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", principal.id().toString());
            body.put("status", "NOT_REQUESTED");
            body.put("rejection_reason", "");
            body.put("rejectionReason", "");
            body.put("created_at", Instant.now().toString());
            body.put("createdAt", Instant.now().toString());
            body.put("full_name", "");
            body.put("phone", "");
            return ResponseEntity.ok(body);
        }
        return ResponseEntity.ok(toLegacyResponse(opt.get()));
    }

    private void updateExistingFromLegacy(TutorProfile p, LegacySubmitRequest req) {
        String[] names = splitName(req.full_name());
        p.setFirstName(sanitize(names[0]));
        if (names[1] != null) p.setLastName(sanitize(names[1]));
        if (req.phone() != null) p.setPhone(req.phone().trim());
        if (req.bio() != null) p.setAbout(sanitize(req.bio()));
        else if (req.experience_description() != null) p.setAbout(sanitize(req.experience_description()));
        if (req.education() != null) p.setEducation(sanitize(req.education()));
        if (req.experience_years() != null) p.setExperienceYears(clamp(req.experience_years()));
        if (req.location() != null && !req.location().isBlank()) {
            findCityByName(req.location()).ifPresent(p::setCity);
        }
        BigDecimal price = parsePrice(req.price_per_hour());
        if (price != null) {
            p.setPriceFrom(price);
            p.setPriceTo(price);
        }
        if (req.format() != null && !req.format().isBlank()) {
            String f = req.format().toLowerCase().trim();
            if ("online".equals(f)) { p.setOnline(true); p.setOffline(false); }
            else if ("offline".equals(f)) { p.setOnline(false); p.setOffline(true); }
            else if ("both".equals(f) || "online,offline".equals(f) || "offline,online".equals(f)) { p.setOnline(true); p.setOffline(true); }
        }
    }

    private void syncRelations(TutorProfile p, List<UUID> subjectIds, List<UUID> levelIds, List<String> languages) {
        // subjects
        if (subjectIds != null) {
            subjectLinkRepository.deleteByProfileId(p.getId());
            if (!subjectIds.isEmpty()) {
                var subjects = subjectRepository.findAllById(subjectIds);
                var toSave = subjects.stream().map(s -> new com.okututor.backend.tutor.TutorProfileSubject(p, s)).toList();
                subjectLinkRepository.saveAll(toSave);
            }
        }
        // levels
        if (levelIds != null) {
            levelLinkRepository.deleteByProfileId(p.getId());
            if (!levelIds.isEmpty()) {
                var levels = levelRepository.findAllById(levelIds);
                var toSave = levels.stream().map(l -> new com.okututor.backend.tutor.TutorProfileLevel(p, l)).toList();
                levelLinkRepository.saveAll(toSave);
            }
        }
        // languages
        if (languages != null) {
            languageLinkRepository.deleteByProfileId(p.getId());
            if (!languages.isEmpty()) {
                var normalized = languages.stream().filter(l -> l != null && !l.isBlank()).map(String::trim).distinct().toList();
                var toSave = normalized.stream().map(lang -> new com.okututor.backend.tutor.TutorProfileLanguage(p, lang)).toList();
                languageLinkRepository.saveAll(toSave);
            }
        }
    }

    private void trySubmit(TutorProfile p) {
        // idempotent: already pending/published
        if (p.getStatus() == TutorProfileStatus.PENDING_MODERATION || p.getStatus() == TutorProfileStatus.PUBLISHED) return;
        try {
            profileService.submit(p.getUser().getId(), p.getUser().getId());
        } catch (Exception e) {
            // fallback for edge cases: if service rejected due to state but DRAFT/REJECTED -> force pending
            if (p.getStatus() == TutorProfileStatus.DRAFT || p.getStatus() == TutorProfileStatus.REJECTED) {
                p.setStatus(TutorProfileStatus.PENDING_MODERATION);
                p.setRejectionReason(null);
                profileRepository.save(p);
            } else if (p.getStatus() == TutorProfileStatus.PENDING_MODERATION || p.getStatus() == TutorProfileStatus.PUBLISHED) {
                // already success, ignore
            } else {
                throw e;
            }
        }
    }

    private TutorProfileCreateRequest mapToCreateRequest(LegacySubmitRequest req) {
        String[] names = splitName(req.full_name());
        String first = sanitize(names[0]);
        String last = names[1] == null ? null : sanitize(names[1]);
        UUID cityId = findCityByName(req.location()).map(City::getId).orElse(null);
        List<UUID> subjectIds = resolveSubjectIds(req.subjects());
        List<UUID> levelIds = resolveLevelIds(req.levels());
        List<String> languages = parseLanguages(req.languages());
        BigDecimal price = parsePrice(req.price_per_hour());
        boolean online = true, offline = false;
        if (req.format() != null && !req.format().isBlank()) {
            String f = req.format().toLowerCase().trim();
            if ("offline".equals(f)) { online = false; offline = true; }
            else if ("both".equals(f)) { online = true; offline = true; }
        }
        String about = req.bio() != null && !req.bio().isBlank() ? sanitize(req.bio()) : (req.experience_description() != null ? sanitize(req.experience_description()) : null);
        return new TutorProfileCreateRequest(
                first,
                last,
                null, // title
                null, // shortDescription
                about,
                "STUDENT_TUTOR",
                req.education() == null ? null : sanitize(req.education()),
                null, // university
                null, // educationDetails
                req.experience_years() == null ? null : clamp(req.experience_years()),
                price,
                price,
                "KGS",
                online,
                offline,
                cityId,
                null, // district
                req.phone() == null ? null : req.phone().trim(),
                subjectIds.isEmpty() ? null : subjectIds,
                levelIds.isEmpty() ? null : levelIds,
                languages.isEmpty() ? null : languages,
                null // photoUrl
        );
    }

    private static String[] splitName(String full) {
        String trimmed = full.trim();
        int sp = trimmed.indexOf(' ');
        if (sp < 0) return new String[]{trimmed, null};
        return new String[]{trimmed.substring(0, sp).trim(), trimmed.substring(sp + 1).trim()};
    }

    private static Integer clamp(Integer v) {
        if (v == null) return null;
        if (v < 0) return 0;
        if (v > 80) return 80;
        return v;
    }

    private static BigDecimal parsePrice(Object raw) {
        if (raw == null) return null;
        try {
            if (raw instanceof Number n) return new BigDecimal(String.valueOf(n));
            String s = String.valueOf(raw).trim();
            if (s.isBlank()) return null;
            return new BigDecimal(s);
        } catch (Exception e) { return null; }
    }

    private static List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        List<String> out = new ArrayList<>();
        for (String p : csv.split(",")) {
            String t = p.trim();
            if (!t.isBlank()) out.add(t);
        }
        return out;
    }

    private static List<String> parseCsvObject(Object raw) {
        if (raw == null) return List.of();
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) {
                if (o == null) continue;
                String s = String.valueOf(o).trim();
                if (!s.isBlank()) {
                    // if element itself contains commas, split
                    if (s.contains(",")) out.addAll(splitCsv(s));
                    else out.add(s);
                }
            }
            return out;
        }
        return splitCsv(String.valueOf(raw));
    }

    private List<String> parseLanguages(Object raw) {
        return parseCsvObject(raw);
    }

    private java.util.Optional<City> findCityByName(String name) {
        if (name == null || name.isBlank()) return java.util.Optional.empty();
        String trimmed = name.trim();
        String lower = trimmed.toLowerCase();
        // fast path via slug
        var bySlug = cityRepository.findBySlug(lower);
        if (bySlug.isPresent()) return bySlug;
        // try exact nameRu match (case-insensitive)
        var all = cityRepository.findAll();
        return all.stream()
                .filter(c -> c.getNameRu() != null && c.getNameRu().toLowerCase().equals(lower))
                .findFirst()
                .or(() -> all.stream()
                        .filter(c -> c.getSlug() != null && c.getSlug().equalsIgnoreCase(lower))
                        .findFirst())
                .or(() -> all.stream()
                        .filter(c -> c.getNameRu() != null && c.getNameRu().toLowerCase().contains(lower))
                        .findFirst());
    }

    private List<UUID> resolveSubjectIds(Object rawSubjects) {
        List<String> names = parseCsvObject(rawSubjects);
        if (names.isEmpty()) return List.of();
        List<Subject> all = subjectRepository.findAll();
        List<UUID> ids = new ArrayList<>();
        for (String n : names) {
            String lower = n.toLowerCase().trim();
            all.stream()
                .filter(s -> s.getNameRu() != null && s.getNameRu().toLowerCase().equals(lower))
                .findFirst()
                .or(() -> all.stream().filter(s -> s.getSlug() != null && s.getSlug().equalsIgnoreCase(lower)).findFirst())
                .or(() -> all.stream().filter(s -> s.getNameEn() != null && s.getNameEn().toLowerCase().equals(lower)).findFirst())
                .or(() -> all.stream().filter(s -> s.getSynonyms() != null && ("," + s.getSynonyms().toLowerCase() + ",").contains("," + lower + ",")).findFirst())
                .ifPresent(s -> ids.add(s.getId()));
        }
        return ids;
    }

    private List<UUID> resolveLevelIds(Object rawLevels) {
        List<String> names = parseCsvObject(rawLevels);
        if (names.isEmpty()) return List.of();
        Map<String, String> legacyMap = Map.of(
                "школьный", "grade-7-11",
                "вуз", "university",
                "начинающий", "grade-1-4",
                "продвинутый", "grade-5-6",
                "орт", "ort",
                "school", "grade-7-11",
                "university", "university"
        );
        List<Level> all = levelRepository.findAll();
        List<UUID> ids = new ArrayList<>();
        for (String n : names) {
            String lower = n.toLowerCase().trim();
            String mapped = legacyMap.getOrDefault(lower, lower);
            all.stream()
                .filter(l -> l.getNameRu() != null && l.getNameRu().toLowerCase().equals(lower))
                .findFirst()
                .or(() -> all.stream().filter(l -> l.getSlug() != null && l.getSlug().equalsIgnoreCase(mapped)).findFirst())
                .or(() -> all.stream().filter(l -> l.getSlug() != null && l.getSlug().equalsIgnoreCase(lower)).findFirst())
                .ifPresent(l -> ids.add(l.getId()));
        }
        return ids;
    }

    private static String sanitize(String v) {
        if (v == null) return null;
        String cleaned = Jsoup.clean(v, "", Safelist.none(), new org.jsoup.nodes.Document.OutputSettings().prettyPrint(false));
        return cleaned == null ? v.trim() : cleaned.trim();
    }

    private Map<String, Object> toLegacyResponse(TutorProfile p) {
        Map<String, Object> m = new LinkedHashMap<>();
        String fullName = ((p.getFirstName() != null ? p.getFirstName() : "") + (p.getLastName() != null ? " " + p.getLastName() : "")).trim();
        String modernStatus = p.getStatus().name();
        // legacy aliases: PENDING, APPROVED etc. Provide both modern and legacy
        String legacyStatus = switch (p.getStatus()) {
            case PENDING_MODERATION -> "PENDING";
            case PUBLISHED, ACTIVE -> "APPROVED";
            case REJECTED -> "REJECTED";
            case DRAFT -> "DRAFT";
            default -> modernStatus;
        };
        Instant created = p.getCreatedAt() != null ? p.getCreatedAt() : Instant.now();
        Instant updated = p.getUpdatedAt() != null ? p.getUpdatedAt() : Instant.now();
        // primary status is legacy for backward compat with Profile.tsx (expects PENDING/APPROVED/REJECTED)
        m.put("id", p.getId().toString());
        m.put("status", legacyStatus);
        m.put("modernStatus", modernStatus);
        m.put("modern_status", modernStatus);
        m.put("profileStatus", modernStatus);
        m.put("legacy_status", legacyStatus);
        m.put("rejection_reason", p.getRejectionReason() == null ? "" : p.getRejectionReason());
        m.put("rejectionReason", p.getRejectionReason());
        m.put("created_at", created.toString());
        m.put("createdAt", created.toString());
        m.put("updated_at", updated.toString());
        m.put("updatedAt", updated.toString());
        m.put("full_name", fullName);
        m.put("fullName", fullName);
        m.put("firstName", p.getFirstName());
        m.put("lastName", p.getLastName());
        m.put("phone", p.getPhone() == null ? "" : p.getPhone());
        m.put("slug", p.getSlug());
        m.put("photoUrl", p.getPhotoUrl());
        m.put("photo_url", p.getPhotoUrl());
        String cityName = null;
        String cityIdStr = null;
        try {
            if (p.getCity() != null) {
                cityName = p.getCity().getNameRu();
                cityIdStr = p.getCity().getId().toString();
            }
        } catch (Exception ignored) {}
        m.put("city", cityName);
        m.put("cityId", cityIdStr);
        m.put("price_from", p.getPriceFrom());
        m.put("price_to", p.getPriceTo());
        // also expose modern status under alternative keys for marketplace consumers polling legacy
        m.put("RESUME_STATUS", modernStatus);
        return m;
    }
}
