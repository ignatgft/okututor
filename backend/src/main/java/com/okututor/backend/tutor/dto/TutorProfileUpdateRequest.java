package com.okututor.backend.tutor.dto;

import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record TutorProfileUpdateRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 200) String title,
        @Size(max = 300) String shortDescription,
        @Size(max = 5000) String about,
        String tutorType,
        @Size(max = 500) String education,
        @Size(max = 200) String university,
        @Size(max = 2000) String educationDetails,
        Integer experienceYears,
        BigDecimal priceFrom,
        BigDecimal priceTo,
        String currency,
        Boolean online,
        Boolean offline,
        UUID cityId,
        UUID districtId,
        @Size(max = 40) String phone,
        List<UUID> subjectIds,
        List<UUID> levelIds,
        List<String> languages
) {}
