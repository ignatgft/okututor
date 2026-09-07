package com.okututor.backend.search;

import com.okututor.backend.location.CityRepository;
import com.okututor.backend.search.normalizer.SearchQueryNormalizer;
import com.okututor.backend.subject.SubjectRepository;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileSubjectRepository;
import com.okututor.backend.tutor.TutorSearchProjection;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.tutor.TutorProfileMapper;
import com.okututor.backend.tutor.TutorProfileLevelRepository;
import com.okututor.backend.tutor.TutorProfileLanguageRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
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
    private final com.okututor.backend.subject.SubjectRepository subjectRefRepository;
    private final SearchQueryNormalizer normalizer;
    private final CityRepository cityRepository;
    private final SearchProperties searchProperties;

    public TutorSearchService(TutorProfileRepository profileRepository,
                              TutorProfileSubjectRepository profileSubjectRepository,
                              TutorProfileLevelRepository levelRepository,
                              TutorProfileLanguageRepository languageRepository,
                              com.okututor.backend.subject.SubjectRepository subjectRefRepository,
                              SearchQueryNormalizer normalizer,
                              CityRepository cityRepository,
                              SearchProperties searchProperties) {
        this.profileRepository = profileRepository;
        this.profileSubjectRepository = profileSubjectRepository;
        this.levelRepository = levelRepository;
        this.languageRepository = languageRepository;
        this.subjectRefRepository = subjectRefRepository;
        this.normalizer = normalizer;
        this.cityRepository = cityRepository;
        this.searchProperties = searchProperties;
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

        // post-filter by subject slug (profile_subjects) before pagination
        if (subjectSlug != null && !subjectSlug.isBlank() && !candidates.isEmpty()) {
            String target = subjectSlug.toLowerCase(Locale.ROOT);
            candidates = candidates.stream().filter(c -> {
                var subs = profileSubjectRepository.findByProfileId(c.getId());
                return subs.stream().anyMatch(ps -> ps.getSubject().getSlug().equalsIgnoreCase(target));
            }).toList();
        }
        // filter by language
        if (language != null && !language.isBlank() && !candidates.isEmpty()) {
            String langLower = language.toLowerCase(Locale.ROOT);
            candidates = candidates.stream().filter(c -> {
                var langs = languageRepository.findByProfileId(c.getId());
                return langs.stream().anyMatch(lg -> lg.getLanguage().equalsIgnoreCase(langLower));
            }).toList();
        }
        // filter by price range (in-memory)
        if ((priceFrom != null || priceTo != null) && !candidates.isEmpty()) {
            candidates = candidates.stream().filter(c -> {
                BigDecimal from = c.getPriceFrom();
                BigDecimal to = c.getPriceTo();
                // keep if price range overlaps requested range
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

        long total = candidates.size();
        int pageNum = Math.max(page, 0);
        int pageSize = Math.min(Math.max(size, 1), searchProperties.getMaxPageSize());
        PageRequest pr = PageRequest.of(pageNum, pageSize);
        int from = Math.min(pageNum * pageSize, candidates.size());
        int to = Math.min(from + pageSize, candidates.size());
        List<TutorSearchProjection> pageSlice = candidates.subList(from, to);

        List<TutorProfileResponse> content = pageSlice.stream().map(p -> {
            var profileOpt = profileRepository.findByIdWithLocation(p.getId());
            if (profileOpt.isEmpty()) return null;
            TutorProfile profile = profileOpt.get();
            var subs = profileSubjectRepository.findByProfileId(profile.getId()).stream().map(s -> s.getSubject()).toList();
            var levs = levelRepository.findByProfileId(profile.getId()).stream().map(l -> l.getLevel()).toList();
            var langs = languageRepository.findByProfileId(profile.getId()).stream().map(lg -> lg.getLanguage()).toList();
            return TutorProfileMapper.toResponse(profile, subs, levs, langs, false);
        }).filter(r -> r != null).toList();

        log.info("TUTOR_SEARCH q_len={} candidates={} results={} total={} db_ms={}", q == null ? 0 : q.length(), candidates.size(), content.size(), total, dbMs);

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
