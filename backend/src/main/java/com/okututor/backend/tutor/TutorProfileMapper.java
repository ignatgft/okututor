package com.okututor.backend.tutor;

import com.okututor.backend.level.Level;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import java.util.List;
import java.util.UUID;

public class TutorProfileMapper {

    public static TutorProfileResponse toResponse(TutorProfile p,
                                                   List<Subject> subjects,
                                                   List<Level> levels,
                                                   List<String> languages,
                                                   boolean includePhone) {
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
                p.getRejectionReason(),
                p.getViewsCount(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                p.getPublishedAt(),
                subjects.stream().map(s -> new TutorProfileResponse.SubjectRef(s.getId(), s.getSlug(), s.getNameRu())).toList(),
                levels.stream().map(l -> new TutorProfileResponse.LevelRef(l.getId(), l.getSlug(), l.getNameRu())).toList(),
                languages
        );
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
}
