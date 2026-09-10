package com.okututor.backend.tutor.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TutorProfileResponse(
        UUID id,
        UUID userId,
        String slug,
        String firstName,
        String lastName,
        String title,
        String shortDescription,
        String about,
        String tutorType,
        String education,
        String university,
        String educationDetails,
        Integer experienceYears,
        BigDecimal priceFrom,
        BigDecimal priceTo,
        String currency,
        boolean online,
        boolean offline,
        CityRef city,
        DistrictRef district,
        String phone, // null if not owner/admin and not PUBLISHED? policy inside service
        String status,
        String rejectionReason,
        int viewsCount,
        Instant createdAt,
        Instant updatedAt,
        Instant publishedAt,
        List<SubjectRef> subjects,
        List<LevelRef> levels,
        List<String> languages,
        String seoTitle,
        String seoDescription,
        String seoKeywords,
        boolean noindex,
        java.math.BigDecimal rating,
        int reviewsCount,
        List<String> achievements,
        List<EducationRef> educationList,
        String photoUrl,
        String fullName,
        boolean isVerified
) {
    public record CityRef(UUID id, String slug, String nameRu) {}
    public record DistrictRef(UUID id, String slug, String nameRu) {}
    public record SubjectRef(UUID id, String slug, String nameRu) {}
    public record LevelRef(UUID id, String slug, String nameRu) {}
    public record EducationRef(String institution, String specialty, String years) {}
}
