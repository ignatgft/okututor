package com.okututor.backend.tutor;

import com.okututor.backend.level.Level;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import java.util.List;
import java.util.UUID;

public class TutorProfileMapper {

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    public static TutorProfileResponse toResponse(TutorProfile p,
                                                   List<Subject> subjects,
                                                   List<Level> levels,
                                                   List<String> languages,
                                                   boolean includePhone) {
        List<String> achievements = parseAchievements(p.getAchievements());
        List<TutorProfileResponse.EducationRef> eduList = parseEducation(p);
        String photoUrl = p.getPhotoUrl();
        if (photoUrl != null && isGooglePhoto(photoUrl)) photoUrl = null;
        String fullName = (p.getFirstName() != null ? p.getFirstName() : "") + (p.getLastName() != null ? " " + p.getLastName() : "");
        fullName = fullName.trim();
        boolean isVerified = p.getStatus() == TutorProfileStatus.PUBLISHED;

        boolean expiringSoon = p.getExpiresAt() != null && p.getExpiresAt().isAfter(java.time.Instant.now()) && p.getExpiresAt().isBefore(java.time.Instant.now().plusSeconds(3L * 24 * 3600));
        // noindex for expired/hidden
        boolean noindexVal = p.isNoindex() || p.getStatus() == TutorProfileStatus.EXPIRED || p.getStatus() == TutorProfileStatus.HIDDEN || (p.getExpiresAt() != null && p.getExpiresAt().isBefore(java.time.Instant.now()));
        return new TutorProfileResponse(
                p.getId(),
                p.getUser().getId(),
                p.getSlug(),
                p.getFirstName(),
                p.getLastName(),
                p.getTitle(),
                p.getShortDescription(),
                p.getAbout(),
                p.getTutorType().name(),
                p.getEducation(),
                p.getUniversity(),
                p.getEducationDetails(),
                p.getExperienceYears(),
                p.getPriceFrom(),
                p.getPriceTo(),
                p.getCurrency(),
                p.isOnline(),
                p.isOffline(),
                p.getCity() == null ? null : new TutorProfileResponse.CityRef(p.getCity().getId(), p.getCity().getSlug(), p.getCity().getNameRu()),
                p.getDistrict() == null ? null : new TutorProfileResponse.DistrictRef(p.getDistrict().getId(), p.getDistrict().getSlug(), p.getDistrict().getNameRu()),
                includePhone ? p.getPhone() : null,
                p.getStatus().name(),
                p.getStatus().getLabel(),
                p.getRejectionReason(),
                p.getViewsCount(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                p.getPublishedAt(),
                p.getExpiresAt(),
                p.getLastActiveAt(),
                p.getHiddenAt(),
                p.getArchivedAt(),
                expiringSoon,
                subjects.stream().map(s -> new TutorProfileResponse.SubjectRef(s.getId(), s.getSlug(), s.getNameRu())).toList(),
                levels.stream().map(l -> new TutorProfileResponse.LevelRef(l.getId(), l.getSlug(), l.getNameRu())).toList(),
                languages,
                p.getSeoTitle() != null ? p.getSeoTitle() : (p.getTitle() != null ? p.getTitle() + " — " + fullName + " | OkuTutor" : null),
                p.getSeoDescription() != null ? p.getSeoDescription() : p.getShortDescription(),
                p.getSeoKeywords(),
                noindexVal,
                p.getRating(),
                p.getReviewsCount(),
                achievements,
                eduList,
                photoUrl,
                fullName,
                isVerified
        );
    }

    private static List<String> parseAchievements(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return MAPPER.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private static List<TutorProfileResponse.EducationRef> parseEducation(TutorProfile p) {
        if (p.getEducationJson() != null && !p.getEducationJson().isBlank()) {
            try {
                return MAPPER.readValue(p.getEducationJson(), new com.fasterxml.jackson.core.type.TypeReference<List<TutorProfileResponse.EducationRef>>() {});
            } catch (Exception ignored) {}
        }
        // legacy single education - only if explicitly provided, no mock fallback
        if (p.getUniversity() != null || p.getEducation() != null) {
            String inst = p.getUniversity();
            String spec = p.getEducation();
            String years = p.getEducationDetails();
            if (inst == null && spec == null) return List.of();
            // if only one provided, keep the other as null, frontend will handle
            return List.of(new TutorProfileResponse.EducationRef(
                    inst != null ? inst : "",
                    spec != null ? spec : "",
                    years != null ? years : ""));
        }
        return List.of();
    }

    public static String slugify(String firstName, String lastName, UUID id) {
        String base = (firstName + "-" + (lastName == null ? "" : lastName)).toLowerCase()
                .replaceAll("[^a-zа-я0-9]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "tutor";
        if (base.length() > 60) base = base.substring(0, 60).replaceAll("-$", "");
        String suffix = id.toString().substring(0, 8);
        return base + "-" + suffix;
    }

    private static boolean isGooglePhoto(String url) {
        return com.okututor.backend.common.util.PhotoUrlUtils.isGooglePhoto(url);
    }
}
