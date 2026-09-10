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

        boolean hasText = q != null && !q.isBlank();
        SearchQueryNormalizer.NormalizedQuery normalized = hasText ? normalizer.normalize(q) : SearchQueryNormalizer.NormalizedQuery.empty();
        boolean reallyHasText = hasText && !normalized.originalTokens().isEmpty();

        String firstToken = reallyHasText ? normalized.originalTokens().get(0) : null;
        String ftsQuery = reallyHasText && !normalized.ftsQuery().isEmpty() ? normalized.ftsQuery() : null;
        String synRegex = null;
        if (reallyHasText) {
            List<String> tokensForSyn = new ArrayList<>(normalized.expandedTokens());
            if (tokensForSyn.isEmpty()) tokensForSyn = new ArrayList<>(normalized.originalTokens());
            synRegex = buildSynonymRegex(tokensForSyn);
        }

        int candidateLimit = Math.max(1, searchProperties.getCandidateLimit());
        String tutorTypeParam = tutorType == null || tutorType.isBlank() ? null : tutorType.toUpperCase(Locale.ROOT);

        long dbStart = System.nanoTime();
        List<TutorSearchProjection> candidates = profileRepository.searchCandidates(
                ftsQuery, firstToken, synRegex, firstToken, reallyHasText, cityId, tutorTypeParam, online, offline, candidateLimit);
        long dbMs = (System.nanoTime() - dbStart) / 1_000_000;

        // post-filter by subject/language/level/district — BATCHED to avoid N+1 (was 4*100 queries)
        if (!candidates.isEmpty() && (subjectSlug != null && !subjectSlug.isBlank()
                || language != null && !language.isBlank()
                || levelSlug != null && !levelSlug.isBlank()
                || districtSlug != null && !districtSlug.isBlank())) {
            List<UUID> allIds = candidates.stream().map(TutorSearchProjection::getId).toList();
            final Map<UUID, List<com.okututor.backend.subject.Subject>> allSubjectMap = (subjectSlug != null && !subjectSlug.isBlank())
                    ? profileSubjectRepository.findByProfileIdIn(allIds).stream()
                        .collect(Collectors.groupingBy(s -> s.getProfile().getId(), Collectors.mapping(TutorProfileSubject::getSubject, Collectors.toList())))
                    : Map.of();
            final Map<UUID, List<String>> allLangMap = (language != null && !language.isBlank())
                    ? languageRepository.findByProfileIdIn(allIds).stream()
                        .collect(Collectors.groupingBy(l -> l.getProfile().getId(), Collectors.mapping(TutorProfileLanguage::getLanguage, Collectors.toList())))
                    : Map.of();
            final Map<UUID, List<com.okututor.backend.level.Level>> allLevelMap = (levelSlug != null && !levelSlug.isBlank())
                    ? levelRepository.findByProfileIdIn(allIds).stream()
                        .collect(Collectors.groupingBy(l -> l.getProfile().getId(), Collectors.mapping(TutorProfileLevel::getLevel, Collectors.toList())))
                    : Map.of();
            final Map<UUID, TutorProfile> profileMapForDistrict = (districtSlug != null && !districtSlug.isBlank())
                    ? profileRepository.findAllWithLocationByIdIn(allIds).stream()
                        .collect(Collectors.toMap(TutorProfile::getId, p -> p))
                    : Map.of();
            if (subjectSlug != null && !subjectSlug.isBlank()) {
                String target = subjectSlug.toLowerCase(Locale.ROOT);
                candidates = candidates.stream().filter(c -> {
                    var subs = allSubjectMap.getOrDefault(c.getId(), java.util.Collections.emptyList());
                    return subs.stream().anyMatch(s -> s.getSlug().equalsIgnoreCase(target));
                }).toList();
            }
            if (language != null && !language.isBlank()) {
                String langLower = language.toLowerCase(Locale.ROOT);
                candidates = candidates.stream().filter(c -> {
                    var langs = allLangMap.getOrDefault(c.getId(), java.util.Collections.emptyList());
                    return langs.stream().anyMatch(lg -> lg.equalsIgnoreCase(langLower));
                }).toList();
            }
            if (levelSlug != null && !levelSlug.isBlank()) {
                String target = levelSlug.toLowerCase(Locale.ROOT);
                candidates = candidates.stream().filter(c -> {
                    var levs = allLevelMap.getOrDefault(c.getId(), java.util.Collections.emptyList());
                    return levs.stream().anyMatch(lv -> lv.getSlug().equalsIgnoreCase(target));
                }).toList();
            }
            if (districtSlug != null && !districtSlug.isBlank()) {
                String target = districtSlug.toLowerCase(Locale.ROOT);
                candidates = candidates.stream().filter(c -> {
                    var p = profileMapForDistrict.get(c.getId());
                    return p != null && p.getDistrict() != null && p.getDistrict().getSlug().equalsIgnoreCase(target);
                }).toList();
            }
        }
        // filter by price range (in-memory, cheap)
        if ((priceFrom != null || priceTo != null) && !candidates.isEmpty()) {
            candidates = candidates.stream().filter(c -> {
                BigDecimal from = c.getPriceFrom();
                BigDecimal to = c.getPriceTo();
                if (priceFrom != null) {
                    BigDecimal pTo = to != null ? to : from;
                    if (pTo == null || pTo.compareTo(priceFrom) < 0) return false;
                }
                if (priceTo != null) {
                    BigDecimal pFrom = from != null ? from : to;
                    if (pFrom == null || pFrom.compareTo(priceTo) > 0) return false;
                }
                return true;
            }).toList();
        }
        // sort handling
        if (sort != null && !sort.isBlank() && !candidates.isEmpty()) {
            String s = sort.toLowerCase(Locale.ROOT).trim();
            Comparator<TutorSearchProjection> cmp = null;
            if (s.contains("price")) {
                cmp = Comparator.comparing(p -> p.getPriceFrom() != null ? p.getPriceFrom() : BigDecimal.valueOf(Long.MAX_VALUE));
                if (s.contains("desc") || s.startsWith("-")) cmp = cmp.reversed();
            } else if (s.contains("views")) {
                cmp = Comparator.comparingInt(TutorSearchProjection::getViewsCount);
                if (!s.contains("asc")) cmp = cmp.reversed();
                else if (s.startsWith("-")) cmp = cmp.reversed();
            } else if (s.contains("published")) {
                cmp = Comparator.comparing(TutorSearchProjection::getPublishedAt, Comparator.nullsLast(Comparator.naturalOrder()));
                if (s.contains("asc")) { /* keep */ } else cmp = cmp.reversed();
            }
            if (cmp != null) {
                candidates = candidates.stream().sorted(cmp).toList();
            }
        }

        long total = candidates.size();
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

        log.info("TUTOR_SEARCH q_len={} candidates={} results={} total={} db_ms={}", q == null ? 0 : q.length(), candidates.size(), content.size(), total, dbMs);
        long searchMs = (System.nanoTime() - dbStart) / 1_000_000;
        try {
            metrics.tutorSearch();
            if (content.isEmpty() && total == 0) metrics.tutorSearchNoResults();
            metrics.tutorSearchDuration(searchMs);
        } catch (Exception ignored) {}

        return new PageImpl<>(content, pr, total);
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
