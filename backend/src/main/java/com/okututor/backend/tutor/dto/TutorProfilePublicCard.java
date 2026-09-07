package com.okututor.backend.tutor.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// lightweight card for listing/search
public record TutorProfilePublicCard(
        UUID id,
        String slug,
        String firstName,
        String lastName,
        String title,
        String shortDescription,
        String tutorType,
        BigDecimal priceFrom,
        BigDecimal priceTo,
        String currency,
        boolean online,
        boolean offline,
        String citySlug,
        String cityName,
        String status,
        int viewsCount,
        Instant publishedAt,
        List<String> subjectSlugs,
        List<String> subjectNames
) {}
