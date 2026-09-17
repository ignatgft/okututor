package com.okututor.backend.search;

import com.okututor.backend.common.api.PageResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private final TutorSearchService tutorSearchService;

    public SearchController(TutorSearchService tutorSearchService) {
        this.tutorSearchService = tutorSearchService;
    }

    @GetMapping("/tutors")
    public PageResponse<com.okututor.backend.tutor.dto.TutorProfileResponse> searchTutors(
            @RequestParam(required = false) @Size(max = 200) String q,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String district,
            @RequestParam(name = "tutor_type", required = false) String tutorType,
            @RequestParam(name = "tutorType", required = false) String tutorTypeAlias,
            @RequestParam(name = "price_from", required = false) BigDecimal priceFrom,
            @RequestParam(name = "price_to", required = false) BigDecimal priceTo,
            @RequestParam(name = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(name = "maxPrice", required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean online,
            @RequestParam(required = false) Boolean offline,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String tt = tutorType != null ? tutorType : tutorTypeAlias;
        BigDecimal pf = minPrice != null ? minPrice : priceFrom;
        BigDecimal pt = maxPrice != null ? maxPrice : priceTo;
        var result = tutorSearchService.search(q, subject, city, tt, pf, pt, online, offline, language, level, district, sort, page, size);
        return PageResponse.of(result);
    }

    @GetMapping("/suggestions")
    public java.util.Map<String, Object> suggestions(
            @RequestParam
            @Size(max = 200, message = "q must be at most 200 characters") String q) {
        // Marketplace suggestions — tutors only
        var page = tutorSearchService.search(q, null, null, null, null, null, null, null, null, null, null, null, 0, 5);
        return java.util.Map.of("tutors", page.getContent(), "courses", java.util.List.of());
    }
}
