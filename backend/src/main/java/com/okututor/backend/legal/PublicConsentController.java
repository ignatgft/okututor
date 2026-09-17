package com.okututor.backend.legal;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/consent")
public class PublicConsentController {

    private final LegalDocumentRepository documentRepository;
    private final LegalDocumentVersionRepository versionRepository;
    private final CookieCategoryRepository categoryRepository;
    private final CookieProviderRepository providerRepository;

    public PublicConsentController(LegalDocumentRepository documentRepository,
                                   LegalDocumentVersionRepository versionRepository,
                                   CookieCategoryRepository categoryRepository,
                                   CookieProviderRepository providerRepository) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.categoryRepository = categoryRepository;
        this.providerRepository = providerRepository;
    }

    @GetMapping("/config")
    @Transactional(readOnly = true)
    public Map<String, Object> config() {
        var docs = documentRepository.findAll().stream().map(d -> {
            var published = versionRepository.findByDocumentIdOrderByCreatedAtDesc(d.getId()).stream()
                    .filter(v -> v.getStatus() == LegalDocumentVersion.Status.PUBLISHED)
                    .findFirst().orElse(null);
            return Map.of(
                    "type", d.getType(),
                    "title", d.getTitle(),
                    "version", published != null ? published.getVersion() : "0",
                    "requiresReconsent", published != null && published.isRequiresReconsent(),
                    "effectiveAt", published != null && published.getEffectiveAt() != null ? published.getEffectiveAt().toString() : ""
            );
        }).collect(Collectors.toList());

        var categories = categoryRepository.findAll().stream().map(c -> Map.of(
                "code", c.getCode(),
                "name", c.getName(),
                "description", c.getDescription() != null ? c.getDescription() : "",
                "isRequired", c.isRequired()
        )).collect(Collectors.toList());

        var providers = providerRepository.findByIsActiveTrue().stream().map(p -> Map.of(
                "id", p.getId().toString(),
                "name", p.getName(),
                "provider", p.getProvider(),
                "category", p.getCategory().getCode(),
                "purpose", p.getPurpose() != null ? p.getPurpose() : "",
                "duration", p.getDuration() != null ? p.getDuration() : ""
        )).collect(Collectors.toList());

        return Map.of(
                "documents", docs,
                "cookieCategories", categories,
                "providers", providers
        );
    }
}
