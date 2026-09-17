package com.okututor.backend.tutor;

import com.okututor.backend.level.Level;
import com.okututor.backend.subject.Subject;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Вынесенная логика батч-загрузки связей профиля (subjects/levels/languages)
 * Устраняет копипасту 4x в TutorProfileService и TutorSearchService.
 */
@Component
public class TutorProfileEnricher {

    private final TutorProfileSubjectRepository subjectRepo;
    private final TutorProfileLevelRepository levelRepo;
    private final TutorProfileLanguageRepository langRepo;
    private final TutorProfileRepository profileRepo;

    public TutorProfileEnricher(TutorProfileSubjectRepository subjectRepo,
                                TutorProfileLevelRepository levelRepo,
                                TutorProfileLanguageRepository langRepo,
                                TutorProfileRepository profileRepo) {
        this.subjectRepo = subjectRepo;
        this.levelRepo = levelRepo;
        this.langRepo = langRepo;
        this.profileRepo = profileRepo;
    }

    public record EnrichedMaps(
            Map<UUID, List<Subject>> subjects,
            Map<UUID, List<Level>> levels,
            Map<UUID, List<String>> languages,
            Map<UUID, TutorProfile> profiles
    ) {}

    public EnrichedMaps loadForIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return new EnrichedMaps(Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap());
        }
        Map<UUID, List<Subject>> subj = subjectRepo.findByProfileIdIn(ids).stream()
                .collect(Collectors.groupingBy(s -> s.getProfile().getId(), Collectors.mapping(TutorProfileSubject::getSubject, Collectors.toList())));
        Map<UUID, List<Level>> lev = levelRepo.findByProfileIdIn(ids).stream()
                .collect(Collectors.groupingBy(l -> l.getProfile().getId(), Collectors.mapping(TutorProfileLevel::getLevel, Collectors.toList())));
        Map<UUID, List<String>> langs = langRepo.findByProfileIdIn(ids).stream()
                .collect(Collectors.groupingBy(l -> l.getProfile().getId(), Collectors.mapping(TutorProfileLanguage::getLanguage, Collectors.toList())));
        Map<UUID, TutorProfile> profs = profileRepo.findAllWithLocationByIdIn(ids).stream()
                .collect(Collectors.toMap(TutorProfile::getId, p -> p));
        return new EnrichedMaps(subj, lev, langs, profs);
    }

    public List<TutorProfileResponse> toResponses(List<UUID> ids, boolean includePhone) {
        EnrichedMaps maps = loadForIds(ids);
        return ids.stream()
                .map(id -> {
                    TutorProfile p = maps.profiles().get(id);
                    if (p == null) return null;
                    return TutorProfileMapper.toResponse(
                            p,
                            maps.subjects().getOrDefault(id, List.of()),
                            maps.levels().getOrDefault(id, List.of()),
                            maps.languages().getOrDefault(id, List.of()),
                            includePhone);
                })
                .filter(r -> r != null)
                .toList();
    }
}
