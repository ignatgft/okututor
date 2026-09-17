package com.okututor.backend.favorite;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.TutorProfileMapper;
import com.okututor.backend.tutor.TutorProfileSubjectRepository;
import com.okututor.backend.tutor.TutorProfileLevelRepository;
import com.okututor.backend.tutor.TutorProfileLanguageRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/favorites")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;
    private final TutorProfileRepository profileRepository;
    private final TutorProfileSubjectRepository subjectRepository;
    private final TutorProfileLevelRepository levelRepository;
    private final TutorProfileLanguageRepository languageRepository;

    public FavoriteController(FavoriteRepository favoriteRepository,
                              TutorProfileRepository profileRepository,
                              TutorProfileSubjectRepository subjectRepository,
                              TutorProfileLevelRepository levelRepository,
                              TutorProfileLanguageRepository languageRepository) {
        this.favoriteRepository = favoriteRepository;
        this.profileRepository = profileRepository;
        this.subjectRepository = subjectRepository;
        this.levelRepository = levelRepository;
        this.languageRepository = languageRepository;
    }

    @PostMapping("/{profileId}")
    @Transactional
    public java.util.Map<String, Object> add(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID profileId) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        var profile = profileRepository.findByIdWithLocation(profileId).orElseThrow(() -> ApiException.notFound("Tutor not found"));
        if (profile.getStatus() != com.okututor.backend.tutor.TutorProfileStatus.PUBLISHED && profile.getStatus() != com.okututor.backend.tutor.TutorProfileStatus.ACTIVE) {
            throw ApiException.validation("Can only favorite published profiles");
        }
        if (profile.getExpiresAt() != null && profile.getExpiresAt().isBefore(java.time.Instant.now())) {
            throw ApiException.validation("Cannot favorite expired profile");
        }
        if (profile.getUser() != null && profile.getUser().isBlocked()) {
            throw ApiException.validation("Cannot favorite blocked tutor");
        }
        if (profile.getUser().getId().equals(principal.id())) throw ApiException.validation("Cannot favorite own profile");
        if (favoriteRepository.existsByUserIdAndTutorProfileId(principal.id(), profileId)) {
            return java.util.Map.of("favorited", true, "count", favoriteRepository.countByTutorProfileId(profileId));
        }
        var fav = new Favorite();
        // use reference to avoid extra select
        var userRef = new com.okututor.backend.user.User();
        userRef.setId(principal.id());
        fav.setUser(userRef);
        fav.setTutorProfile(profile);
        favoriteRepository.save(fav);
        return java.util.Map.of("favorited", true, "count", favoriteRepository.countByTutorProfileId(profileId));
    }

    @DeleteMapping("/{profileId}")
    @Transactional
    public java.util.Map<String, Object> remove(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID profileId) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        favoriteRepository.deleteByUserIdAndTutorProfileId(principal.id(), profileId);
        return java.util.Map.of("favorited", false, "count", favoriteRepository.countByTutorProfileId(profileId));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<TutorProfileResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        var favs = favoriteRepository.findByUserIdWithDetails(principal.id());
        if (favs.isEmpty()) return List.of();
        // filter out non-published/expired/blocked (P2: don't show hidden)
        favs = favs.stream().filter(f -> {
            var p = f.getTutorProfile();
            if (p == null) return false;
            if (p.getStatus() != com.okututor.backend.tutor.TutorProfileStatus.PUBLISHED && p.getStatus() != com.okututor.backend.tutor.TutorProfileStatus.ACTIVE) return false;
            if (p.getExpiresAt() != null && p.getExpiresAt().isBefore(java.time.Instant.now())) return false;
            if (p.getUser() != null && p.getUser().isBlocked()) return false;
            return true;
        }).toList();
        if (favs.isEmpty()) return List.of();
        var ids = favs.stream().map(f -> f.getTutorProfile().getId()).toList();
        var subjectMap = subjectRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getProfile().getId(),
                        java.util.stream.Collectors.mapping(com.okututor.backend.tutor.TutorProfileSubject::getSubject, java.util.stream.Collectors.toList())));
        var levelMap = levelRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(),
                        java.util.stream.Collectors.mapping(com.okututor.backend.tutor.TutorProfileLevel::getLevel, java.util.stream.Collectors.toList())));
        var langMap = languageRepository.findByProfileIdIn(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(l -> l.getProfile().getId(),
                        java.util.stream.Collectors.mapping(com.okututor.backend.tutor.TutorProfileLanguage::getLanguage, java.util.stream.Collectors.toList())));
        return favs.stream().map(f -> {
            var p = f.getTutorProfile();
            var subjects = subjectMap.getOrDefault(p.getId(), List.of());
            var levels = levelMap.getOrDefault(p.getId(), List.of());
            var langs = langMap.getOrDefault(p.getId(), List.of());
            return TutorProfileMapper.toResponse(p, subjects, levels, langs, false);
        }).toList();
    }

    @GetMapping("/ids")
    public List<UUID> ids(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        return favoriteRepository.findTutorProfileIdsByUserId(principal.id());
    }
}
