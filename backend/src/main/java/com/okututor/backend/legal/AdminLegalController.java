package com.okututor.backend.legal;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/legal")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminLegalController {

    private final LegalService legalService;
    private final CookieCategoryRepository categoryRepository;
    private final CookieProviderRepository providerRepository;
    private final ConsentRecordRepository consentRepository;
    private final LegalDocumentRepository documentRepository;

    public AdminLegalController(LegalService legalService,
                                CookieCategoryRepository categoryRepository,
                                CookieProviderRepository providerRepository,
                                ConsentRecordRepository consentRepository,
                                LegalDocumentRepository documentRepository) {
        this.legalService = legalService;
        this.categoryRepository = categoryRepository;
        this.providerRepository = providerRepository;
        this.consentRepository = consentRepository;
        this.documentRepository = documentRepository;
    }

    // Documents
    @GetMapping("/documents")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<LegalDocument> documents() {
        return legalService.listDocuments();
    }

    @PostMapping("/documents")
    public LegalDocument createDocument(@RequestBody Map<String, String> body,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return legalService.createDocument(
                body.get("type"), body.get("title"), body.get("description"),
                principal != null ? principal.id() : null);
    }

    @GetMapping("/documents/{id}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public LegalDocument getDocument(@PathVariable UUID id) {
        return legalService.getDocument(id);
    }

    @GetMapping("/documents/{id}/versions")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<LegalDocumentVersion> versions(@PathVariable UUID id) {
        return legalService.listVersions(id);
    }

    @GetMapping("/documents/{id}/history")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<LegalDocumentVersion> history(@PathVariable UUID id) {
        return legalService.getHistory(id);
    }

    @PostMapping("/documents/{id}/versions")
    public LegalDocumentVersion createVersion(@PathVariable UUID id,
                                              @RequestBody Map<String, Object> body,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return legalService.createVersion(
                id,
                (String) body.get("version"),
                (String) body.get("title"),
                (String) body.get("content"),
                (String) body.getOrDefault("language", "ru"),
                Boolean.TRUE.equals(body.get("requiresReconsent")),
                principal != null ? principal.id() : null);
    }

    @PutMapping("/versions/{id}")
    public LegalDocumentVersion updateDraft(@PathVariable UUID id,
                                           @RequestBody Map<String, Object> body,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return legalService.updateDraft(
                id,
                (String) body.get("title"),
                (String) body.get("content"),
                (String) body.get("language"),
                body.get("requiresReconsent") != null ? (Boolean) body.get("requiresReconsent") : null,
                principal != null ? principal.id() : null);
    }

    @PostMapping("/versions/{id}/publish")
    public LegalDocumentVersion publish(@PathVariable UUID id,
                                        @RequestBody(required = false) Map<String, String> body,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        Instant effectiveAt = null;
        if (body != null && body.get("effectiveAt") != null) {
            try { effectiveAt = Instant.parse(body.get("effectiveAt")); } catch (Exception ignored) {}
        }
        return legalService.publish(id, effectiveAt, principal != null ? principal.id() : null);
    }

    @PostMapping("/versions/{id}/archive")
    public LegalDocumentVersion archive(@PathVariable UUID id,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return legalService.archive(id, principal != null ? principal.id() : null);
    }

    @GetMapping("/versions/{id}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public LegalDocumentVersion getVersion(@PathVariable UUID id) {
        return legalService.getVersion(id);
    }

    // Cookies
    @GetMapping("/cookies/categories")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<CookieCategory> categories() {
        return categoryRepository.findAll();
    }

    @GetMapping("/cookies/providers")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<CookieProvider> providers() {
        return providerRepository.findAllWithCategory();
    }

    @PostMapping("/cookies/providers")
    public CookieProvider createProvider(@RequestBody Map<String, String> body) {
        String categoryCode = body.get("category");
        var cat = categoryRepository.findByCode(categoryCode)
                .orElseThrow(() -> ApiException.notFound("Category not found"));
        CookieProvider p = new CookieProvider();
        p.setName(body.get("name"));
        p.setProvider(body.get("provider"));
        p.setCategory(cat);
        p.setDescription(body.get("description"));
        p.setPurpose(body.get("purpose"));
        p.setDuration(body.get("duration"));
        p.setActive(!"false".equalsIgnoreCase(body.get("isActive")));
        return providerRepository.save(p);
    }

    @PutMapping("/cookies/providers/{id}")
    public CookieProvider updateProvider(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        var p = providerRepository.findById(id).orElseThrow(() -> ApiException.notFound("Provider not found"));
        if (body.get("name") != null) p.setName(body.get("name"));
        if (body.get("provider") != null) p.setProvider(body.get("provider"));
        if (body.get("category") != null) {
            var cat = categoryRepository.findByCode(body.get("category"))
                    .orElseThrow(() -> ApiException.notFound("Category not found"));
            p.setCategory(cat);
        }
        if (body.get("description") != null) p.setDescription(body.get("description"));
        if (body.get("purpose") != null) p.setPurpose(body.get("purpose"));
        if (body.get("duration") != null) p.setDuration(body.get("duration"));
        if (body.get("isActive") != null) p.setActive(Boolean.parseBoolean(body.get("isActive")));
        return providerRepository.save(p);
    }

    @DeleteMapping("/cookies/providers/{id}")
    public void deleteProvider(@PathVariable UUID id) {
        var p = providerRepository.findById(id).orElseThrow(() -> ApiException.notFound("Provider not found"));
        p.setActive(false);
        providerRepository.save(p);
    }

    // Consents
    @GetMapping("/consents")
    public Page<ConsentRecord> consents(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID documentId,
            @RequestParam(required = false) UUID versionId,
            @RequestParam(required = false) String consentType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Instant fromI = from != null ? Instant.parse(from) : null;
        Instant toI = to != null ? Instant.parse(to) : null;
        ConsentRecord.ConsentType ct = consentType != null ? ConsentRecord.ConsentType.valueOf(consentType) : null;
        ConsentRecord.Status st = status != null ? ConsentRecord.Status.valueOf(status) : null;
        return consentRepository.findFiltered(userId, documentId, versionId, ct, st, fromI, toI, PageRequest.of(page, size));
    }

    @GetMapping("/consents/statistics")
    public Map<String, Object> statistics() {
        long total = consentRepository.count();
        long accepted = consentRepository.countByStatus(ConsentRecord.Status.ACCEPTED);
        long required = consentRepository.countByStatus(ConsentRecord.Status.REQUIRED);
        long revoked = consentRepository.countByStatus(ConsentRecord.Status.REVOKED);
        return Map.of("total", total, "accepted", accepted, "required", required, "revoked", revoked);
    }

    @GetMapping("/documents/health")
    public Map<String, Object> health() {
        var docs = documentRepository.findAll();
        long published = docs.stream().filter(d -> 
            !legalService.listVersions(d.getId()).stream().filter(v -> v.getStatus() == LegalDocumentVersion.Status.PUBLISHED).toList().isEmpty()
        ).count();
        long drafts = docs.stream().flatMap(d -> legalService.listVersions(d.getId()).stream())
                .filter(v -> v.getStatus() == LegalDocumentVersion.Status.DRAFT).count();
        long requiring = consentRepository.countByStatus(ConsentRecord.Status.REQUIRED);
        var lastPublished = legalService.listDocuments().stream()
                .flatMap(d -> legalService.listVersions(d.getId()).stream())
                .filter(v -> v.getStatus() == LegalDocumentVersion.Status.PUBLISHED)
                .sorted((a,b) -> b.getPublishedAt() != null && a.getPublishedAt() != null ? b.getPublishedAt().compareTo(a.getPublishedAt()) : 0)
                .findFirst().orElse(null);
        return Map.of(
                "documents", docs.size(),
                "published", published,
                "drafts", drafts,
                "requiringReconsent", requiring,
                "lastPublished", lastPublished != null ? Map.of("title", lastPublished.getTitle(), "version", lastPublished.getVersion(), "publishedAt", lastPublished.getPublishedAt().toString()) : Map.of()
        );
    }
}
