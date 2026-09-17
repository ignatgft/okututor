package com.okututor.backend.search;

import com.okututor.backend.location.CityRepository;
import com.okututor.backend.location.DistrictRepository;
import com.okututor.backend.level.LevelRepository;
import com.okututor.backend.search.normalizer.SearchQueryNormalizer;
import com.okututor.backend.subject.SubjectRepository;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileSubject;
import com.okututor.backend.tutor.TutorProfileSubjectRepository;
import com.okututor.backend.tutor.TutorProfileLevel;
import com.okututor.backend.tutor.TutorSearchProjection;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.TutorProfileMapper;
import com.okututor.backend.tutor.TutorProfileLevelRepository;
import com.okututor.backend.tutor.TutorProfileLanguage;
import com.okututor.backend.tutor.TutorProfileLanguageRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TutorSearchService {

    private static final Logger log = LoggerFactory.getLogger(TutorSearchService.class);

    private final TutorProfileRepository profileRepository;
    private final TutorProfileSubjectRepository profileSubjectRepository;
    private final TutorProfileLevelRepository levelRepository;
    private final TutorProfileLanguageRepository languageRepository;
    private final DistrictRepository districtRepository;
    private final LevelRepository levelRefRepository;
    private final com.okututor.backend.subject.SubjectRepository subjectRefRepository;
    private final SearchQueryNormalizer normalizer;
    private final CityRepository cityRepository;
    private final SearchProperties searchProperties;
    private final com.okututor.backend.observability.ObservabilityMetrics metrics;

    public TutorSearchService(TutorProfileRepository profileRepository,
                              TutorProfileSubjectRepository profileSubjectRepository,
                              TutorProfileLevelRepository levelRepository,
                              TutorProfileLanguageRepository languageRepository,
                              DistrictRepository districtRepository,
                              LevelRepository levelRefRepository,
                              com.okututor.backend.subject.SubjectRepository subjectRefRepository,
                              SearchQueryNormalizer normalizer,
                              CityRepository cityRepository,
                              SearchProperties searchProperties,
                              com.okututor.backend.observability.ObservabilityMetrics metrics) {
        this.profileRepository = profileRepository;
        this.profileSubjectRepository = profileSubjectRepository;
        this.levelRepository = levelRepository;
        this.languageRepository = languageRepository;
        this.districtRepository = districtRepository;
        this.levelRefRepository = levelRefRepository;
        this.subjectRefRepository = subjectRefRepository;
        this.normalizer = normalizer;
        this.cityRepository = cityRepository;
        this.searchProperties = searchProperties;
        this.metrics = metrics;
    }

    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> search(String q,
                                             String subjectSlug,
                                             String citySlug,
                                             String tutorType,
                                             BigDecimal priceFrom,
                                             BigDecimal priceTo,
                                             Boolean online,
                                             Boolean offline,
                                             String language,
                                             int page,
                                             int size) {
        return search(q, subjectSlug, citySlug, tutorType, priceFrom, priceTo, online, offline, language, null, null, null, page, size);
    }

    @Cacheable(value = "tutorSearch", key = "#q + '|' + #subjectSlug + '|' + #citySlug + '|' + #tutorType + '|' + #priceFrom + '|' + #priceTo + '|' + #online + '|' + #offline + '|' + #language + '|' + #levelSlug + '|' + #districtSlug + '|' + #sort + '|' + #page + '|' + #size", unless = "#result == null")
    @Transactional(readOnly = true)
    public Page<TutorProfileResponse> search(String q,
                                             String subjectSlug,
                                             String citySlug,
                                             String tutorType,
                                             BigDecimal priceFrom,
                                             BigDecimal priceTo,
                                             Boolean online,
                                             Boolean offline,
                                             String language,
                                             String levelSlug,
                                             String districtSlug,
                                             String sort,
                                             int page,
                                             int size) {
        // resolve city
        UUID cityId = null;
        if (citySlug != null && !citySlug.isBlank()) {
            var city = cityRepository.findBySlug(citySlug.toLowerCase(Locale.ROOT)).orElse(null);
            if (city != null) cityId = city.getId();
            else {
                // unknown city → empty result (strict)
                return Page.empty(PageRequest.of(page, size));
            }
        }
        // resolve district (P1: SQL filter via district_id)
        UUID districtId = null;
        if (districtSlug != null && !districtSlug.isBlank()) {
            String dSlug = districtSlug.toLowerCase(Locale.ROOT).trim();
            var districtOpt = districtRepository.findBySlug(dSlug);
            // if not found but slug was given, return empty (strict) — avoids false positives
            if (districtOpt.isEmpty()) {
                return Page.empty(PageRequest.of(page, size));
            }
            districtId = districtOpt.get().getId();
        }

        boolean hasText = q != null && !q.isBlank();
        SearchQueryNormalizer.NormalizedQuery normalized = hasText ? normalizer.normalize(q) : SearchQueryNormalizer.NormalizedQuery.empty();
        boolean reallyHasText = hasText && !normalized.originalTokens().isEmpty();

        // P1 fix: use full joined tokens for trgm/exact, not just first token (recall for "высшая математика")
        String qTrgm = reallyHasText ? String.join(" ", normalized.originalTokens()) : null;
        String qExact = qTrgm;
        String ftsQuery = reallyHasText && !normalized.ftsQuery().isEmpty() ? normalized.ftsQuery() : null;
        String synRegex = null;
        if (reallyHasText) {
            List<String> tokensForSyn = new ArrayList<>(normalized.expandedTokens());
            if (tokensForSyn.isEmpty()) tokensForSyn = new ArrayList<>(normalized.originalTokens());
            synRegex = buildSynonymRegex(tokensForSyn);
        }

        int candidateLimit = Math.max(1, searchProperties.getCandidateLimit());
        String tutorTypeParam = tutorType == null || tutorType.isBlank() ? null : tutorType.toUpperCase(Locale.ROOT);
        String subjectParam = (subjectSlug == null || subjectSlug.isBlank()) ? null : subjectSlug.trim();
        String levelParam = (levelSlug == null || levelSlug.isBlank()) ? null : levelSlug.trim();
        String langParam = (language == null || language.isBlank()) ? null : language.trim();
        String sortParam = normalizeSort(sort);

        long dbStart = System.nanoTime();
        List<TutorSearchProjection> candidates = profileRepository.searchCandidates(
                ftsQuery, qTrgm, synRegex, qExact, reallyHasText, cityId, tutorTypeParam, online, offline,
                subjectParam, levelParam, langParam, districtId, priceFrom, priceTo, sortParam, candidateLimit);
        long dbMs = (System.nanoTime() - dbStart) / 1_000_000;

        // P1: correct total via count query (instead of candidates.size() which was capped to LIMIT)
        long total;
        try {
            total = profileRepository.countCandidates(
                    ftsQuery, qTrgm, synRegex, reallyHasText, cityId, tutorTypeParam, online, offline,
                    subjectParam, levelParam, langParam, districtId, priceFrom, priceTo);
        } catch (Exception e) {
            log.warn("countCandidates failed, fallback to candidates.size()", e);
            total = candidates.size();
        }
        int pageNum = Math.max(page, 0);
        int pageSize = Math.min(Math.max(size, 1), searchProperties.getMaxPageSize());
        PageRequest pr = PageRequest.of(pageNum, pageSize);
        int from = Math.min(pageNum * pageSize, candidates.size());
        int to = Math.min(from + pageSize, candidates.size());
        List<TutorSearchProjection> pageSlice = candidates.subList(from, to);

        // batch fetch for pageSlice to avoid 3*N queries (was N+1)
        List<TutorProfileResponse> content;
        if (pageSlice.isEmpty()) {
            content = java.util.Collections.emptyList();
        } else {
            List<UUID> pageIds = pageSlice.stream().map(TutorSearchProjection::getId).toList();
            Map<UUID, List<com.okututor.backend.subject.Subject>> subjectMap = profileSubjectRepository.findByProfileIdIn(pageIds).stream()
                    .collect(Collectors.groupingBy(s -> s.getProfile().getId(), Collectors.mapping(TutorProfileSubject::getSubject, Collectors.toList())));
            Map<UUID, List<com.okututor.backend.level.Level>> levelMap = levelRepository.findByProfileIdIn(pageIds).stream()
                    .collect(Collectors.groupingBy(l -> l.getProfile().getId(), Collectors.mapping(TutorProfileLevel::getLevel, Collectors.toList())));
            Map<UUID, List<String>> langMap = languageRepository.findByProfileIdIn(pageIds).stream()
                    .collect(Collectors.groupingBy(l -> l.getProfile().getId(), Collectors.mapping(TutorProfileLanguage::getLanguage, Collectors.toList())));
            Map<UUID, TutorProfile> profileMap = profileRepository.findAllWithLocationByIdIn(pageIds).stream()
                    .collect(Collectors.toMap(TutorProfile::getId, p -> p));
            content = pageSlice.stream()
                    .map(p -> {
                        TutorProfile profile = profileMap.get(p.getId());
                        if (profile == null) return null;
                        var subs = subjectMap.getOrDefault(profile.getId(), java.util.Collections.emptyList());
                        var levs = levelMap.getOrDefault(profile.getId(), java.util.Collections.emptyList());
                        var langs = langMap.getOrDefault(profile.getId(), java.util.Collections.emptyList());
                        return TutorProfileMapper.toResponse(profile, subs, levs, langs, false);
                    })
                    .filter(r -> r != null)
                    .collect(Collectors.toList());
        }

        log.debug("TUTOR_SEARCH q_len={} candidates={} results={} total={} db_ms={}", q == null ? 0 : q.length(), candidates.size(), content.size(), total, dbMs);
        long searchMs = (System.nanoTime() - dbStart) / 1_000_000;
        try {
            metrics.tutorSearch();
            if (content.isEmpty() && total == 0) metrics.tutorSearchNoResults();
            metrics.tutorSearchDuration(searchMs);
        } catch (Exception ignored) {}

        return new PageImpl<>(content, pr, total);
    }

    private static String normalizeSort(String sort) {
        if (sort == null || sort.isBlank()) return null;
        String s = sort.toLowerCase(Locale.ROOT).trim();
        boolean desc = s.contains("desc") || s.startsWith("-");
        boolean asc = s.contains("asc");
        if (s.contains("price")) return desc ? "price_desc" : "price_asc";
        if (s.contains("views")) return asc ? "views_asc" : "views_desc";
        if (s.contains("published")) return asc ? "published_asc" : "published";
        // default for text relevance — null lets SQL use textScore
        return null;
    }

    private static String buildSynonymRegex(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) return null;
        String pattern = tokens.stream()
                .filter(t -> t != null && !t.isBlank())
                .map(String::trim)
                .map(TutorSearchService::escapeRegex)
                .filter(s -> !s.isBlank())
                .distinct()
                .map(s -> "(?<![[:alnum:]])" + s + "(?![[:alnum:]])")
                .collect(Collectors.joining("|"));
        return pattern.isEmpty() ? null : pattern;
    }

    private static String escapeRegex(String value) {
        return value.replaceAll("([^\\p{L}\\p{N} ])", "\\\\$1");
    }


}
