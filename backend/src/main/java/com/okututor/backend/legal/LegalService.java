package com.okututor.backend.legal;

import com.okututor.backend.admin.AuditEntry;
import com.okututor.backend.admin.AuditLogService;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.user.User;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LegalService {

    private final LegalDocumentRepository documentRepository;
    private final LegalDocumentVersionRepository versionRepository;
    private final AuditLogService auditLog;

    public LegalService(LegalDocumentRepository documentRepository,
                        LegalDocumentVersionRepository versionRepository,
                        AuditLogService auditLog) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.auditLog = auditLog;
    }

    // Document CRUD
    public List<LegalDocument> listDocuments() {
        return documentRepository.findAll();
    }

    public LegalDocument getDocument(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Document not found"));
    }

    public LegalDocument getByType(String type) {
        return documentRepository.findByType(type.toUpperCase())
                .orElseThrow(() -> ApiException.notFound("Document type not found: " + type));
    }

    @Transactional
    public LegalDocument createDocument(String type, String title, String description, UUID actorId) {
        if (documentRepository.findByType(type.toUpperCase()).isPresent()) {
            throw ApiException.conflict("Document type already exists: " + type);
        }
        LegalDocument doc = new LegalDocument();
        doc.setType(type.toUpperCase());
        doc.setTitle(title);
        doc.setDescription(description);
        documentRepository.save(doc);
        auditLog.log(new AuditEntry(actorId, "CREATE_DOCUMENT", "LEGAL_DOCUMENT", doc.getId().toString(), type));
        return doc;
    }

    // Version management
    @Transactional(readOnly = true)
    public List<LegalDocumentVersion> listVersions(UUID documentId) {
        return versionRepository.findByDocumentIdWithFetch(documentId);
    }

    @Transactional(readOnly = true)
    public LegalDocumentVersion getVersion(UUID versionId) {
        return versionRepository.findById(versionId)
                .orElseThrow(() -> ApiException.notFound("Version not found"));
    }

    @Transactional(readOnly = true)
    public LegalDocumentVersion getPublished(String type, String language) {
        String lang = language != null ? language.toLowerCase() : "ru";
        var doc = getByType(type);
        return versionRepository.findPublishedByTypeAndLanguage(doc.getType(), lang)
                .or(() -> versionRepository.findPublishedByTypeAndLanguage(doc.getType(), "ru"))
                .orElseThrow(() -> ApiException.notFound("Published version not found for: " + type));
    }

    @Transactional
    public LegalDocumentVersion createVersion(UUID documentId, String version, String title, String content, String language, boolean requiresReconsent, UUID actorId) {
        LegalDocument doc = getDocument(documentId);
        // check no DRAFT already exists for this doc+language
        var existingDraft = versionRepository.findByDocumentIdAndLanguageOrderByCreatedAtDesc(documentId, language).stream()
                .filter(v -> v.getStatus() == LegalDocumentVersion.Status.DRAFT)
                .findFirst();
        if (existingDraft.isPresent()) {
            throw ApiException.conflict("Draft already exists for this document and language. Publish or archive it first.");
        }
        if (version == null || version.isBlank()) throw ApiException.validation("Version is required");
        if (title == null || title.isBlank()) throw ApiException.validation("Title is required");
        if (content == null || content.isBlank()) throw ApiException.validation("Content is required");

        LegalDocumentVersion v = new LegalDocumentVersion();
        v.setDocument(doc);
        v.setVersion(version);
        v.setTitle(title);
        v.setRawContent(content);
        v.setContent(sanitize(content));
        v.setLanguage(language != null ? language.toLowerCase() : "ru");
        v.setStatus(LegalDocumentVersion.Status.DRAFT);
        v.setRequiresReconsent(requiresReconsent);
        v.setCreatedBy(actorId != null ? refUser(actorId) : null);
        versionRepository.save(v);
        auditLog.log(new AuditEntry(actorId, "CREATE_VERSION", "LEGAL_VERSION", v.getId().toString(), doc.getType() + " " + version));
        return v;
    }

    @Transactional
    public LegalDocumentVersion updateDraft(UUID versionId, String title, String content, String language, Boolean requiresReconsent, UUID actorId) {
        LegalDocumentVersion v = getVersion(versionId);
        if (v.getStatus() != LegalDocumentVersion.Status.DRAFT) {
            throw ApiException.validation("Only DRAFT can be edited");
        }
        if (title != null) v.setTitle(title);
        if (content != null) {
            v.setRawContent(content);
            v.setContent(sanitize(content));
        }
        if (language != null) v.setLanguage(language.toLowerCase());
        if (requiresReconsent != null) v.setRequiresReconsent(requiresReconsent);
        versionRepository.save(v);
        auditLog.log(new AuditEntry(actorId, "UPDATE_DRAFT", "LEGAL_VERSION", v.getId().toString(), v.getDocument().getType() + " " + v.getVersion()));
        return v;
    }

    @Transactional
    public LegalDocumentVersion publish(UUID versionId, Instant effectiveAt, UUID actorId) {
        LegalDocumentVersion v = getVersion(versionId);
        if (v.getStatus() != LegalDocumentVersion.Status.DRAFT) {
            throw ApiException.validation("Only DRAFT can be published");
        }
        if (v.getTitle() == null || v.getTitle().isBlank() || v.getContent() == null || v.getContent().isBlank()) {
            throw ApiException.validation("Title and content are required for publish");
        }
        // close previous PUBLISHED for same doc+language
        var previous = versionRepository.findPublishedByTypeAndLanguage(v.getDocument().getType(), v.getLanguage());
        if (previous.isPresent()) {
            LegalDocumentVersion old = previous.get();
            old.setStatus(LegalDocumentVersion.Status.ARCHIVED);
            versionRepository.save(old);
            auditLog.log(new AuditEntry(actorId, "ARCHIVE", "LEGAL_VERSION", old.getId().toString(), old.getDocument().getType() + " " + old.getVersion()));
        }
        v.setStatus(LegalDocumentVersion.Status.PUBLISHED);
        v.setPublishedAt(Instant.now());
        v.setEffectiveAt(effectiveAt != null ? effectiveAt : Instant.now());
        v.setPublishedBy(actorId != null ? refUser(actorId) : null);
        versionRepository.save(v);
        auditLog.log(new AuditEntry(actorId, "PUBLISH", "LEGAL_VERSION", v.getId().toString(), v.getDocument().getType() + " " + v.getVersion() + " requiresReConsent=" + v.isRequiresReconsent()));

        // Handle re-consent: if requiresReconsent, mark existing ACCEPTED consents as REQUIRED
        if (v.isRequiresReconsent() && previous.isPresent()) {
            // This will be handled by ConsentService on next check, but we can also create REQUIRED records here
            // For MVP, frontend will detect REQUIRED via consent check
        }
        return v;
    }

    @Transactional
    public LegalDocumentVersion archive(UUID versionId, UUID actorId) {
        LegalDocumentVersion v = getVersion(versionId);
        if (v.getStatus() == LegalDocumentVersion.Status.ARCHIVED) {
            throw ApiException.validation("Already archived");
        }
        // Cannot archive PUBLISHED if it's the only published - but spec says ARCHIVE instead of DELETE, so allow
        // But prevent archiving PUBLISHED if it would leave no published version? For MVP, allow but log.
        v.setStatus(LegalDocumentVersion.Status.ARCHIVED);
        versionRepository.save(v);
        auditLog.log(new AuditEntry(actorId, "ARCHIVE", "LEGAL_VERSION", v.getId().toString(), v.getDocument().getType() + " " + v.getVersion()));
        return v;
    }

    public List<LegalDocumentVersion> getHistory(UUID documentId) {
        return listVersions(documentId);
    }

    private String sanitize(String html) {
        if (html == null) return null;
        // If content looks like markdown (no html tags), keep as is
        if (!html.contains("<")) return html;
        // Use Jsoup basic safelist with additional tags for tables
        Safelist safelist = Safelist.basicWithImages()
                .addTags("table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "figure", "figcaption")
                .addAttributes("a", "href", "target", "rel")
                .addAttributes("table", "border", "cellpadding", "cellspacing")
                .addProtocols("a", "href", "http", "https", "mailto");
        String cleaned = Jsoup.clean(html, safelist);
        // Ensure links open safely
        return cleaned;
    }

    private User refUser(UUID id) {
        if (id == null) return null;
        User u = new User();
        u.setId(id);
        return u;
    }
}
