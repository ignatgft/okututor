package com.okututor.backend.legal;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConsentService {

    private final ConsentRecordRepository consentRepository;
    private final LegalDocumentVersionRepository versionRepository;
    private final LegalDocumentRepository documentRepository;
    private final UserRepository userRepository;

    public ConsentService(ConsentRecordRepository consentRepository,
                          LegalDocumentVersionRepository versionRepository,
                          LegalDocumentRepository documentRepository,
                          UserRepository userRepository) {
        this.consentRepository = consentRepository;
        this.versionRepository = versionRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ConsentRecord accept(UUID userId, String consentTypeStr, String documentType, String version, String ip, String userAgent) {
        ConsentRecord.ConsentType type;
        try {
            type = ConsentRecord.ConsentType.valueOf(consentTypeStr.toUpperCase());
        } catch (Exception e) {
            throw ApiException.validation("Invalid consent type: " + consentTypeStr);
        }
        final LegalDocument doc;
        final LegalDocumentVersion ver;
        if (documentType != null) {
            LegalDocument tmpDoc = documentRepository.findByType(documentType.toUpperCase())
                    .orElseThrow(() -> ApiException.notFound("Document not found"));
            var published = versionRepository.findPublishedByTypeAndLanguage(tmpDoc.getType(), "ru")
                    .or(() -> versionRepository.findPublishedByTypeAndLanguage(tmpDoc.getType(), "en"))
                    .orElseThrow(() -> ApiException.validation("No published version for document: " + documentType));
            if (version != null && !version.equals(published.getVersion())) {
                // log but use current
            }
            if (published.getStatus() != LegalDocumentVersion.Status.PUBLISHED) {
                throw ApiException.validation("Version not published");
            }
            doc = tmpDoc;
            ver = published;
        } else {
            doc = null;
            ver = null;
        }
        // Check if already accepted current version
        final UUID docIdForCheck = doc != null ? doc.getId() : null;
        final UUID verIdForCheck = ver != null ? ver.getId() : null;
        var existing = consentRepository.findByUserIdAndDocumentId(userId, docIdForCheck).stream()
                .filter(c -> {
                    if (c.getDocumentVersion() == null && verIdForCheck == null) return true;
                    if (c.getDocumentVersion() == null || verIdForCheck == null) return false;
                    return c.getDocumentVersion().getId().equals(verIdForCheck);
                })
                .filter(c -> c.getStatus() == ConsentRecord.Status.ACCEPTED)
                .findFirst();
        if (existing.isPresent()) {
            return existing.get();
        }

        ConsentRecord rec = new ConsentRecord();
        rec.setUser(loadUser(userId));
        rec.setConsentType(type);
        rec.setDocument(doc);
        rec.setDocumentVersion(ver);
        rec.setStatus(ConsentRecord.Status.ACCEPTED);
        rec.setAcceptedAt(Instant.now());
        rec.setIpAddress(ip);
        rec.setUserAgent(userAgent);
        var saved = consentRepository.save(rec);
        // ensure associations are initialized for JSON serialization outside TX (open-in-view=false)
        saved.getUser().getEmail();
        return saved;
    }

    @Transactional
    public ConsentRecord revoke(UUID userId, String consentTypeStr) {
        ConsentRecord.ConsentType type = ConsentRecord.ConsentType.valueOf(consentTypeStr.toUpperCase());
        // Only allow revoking MARKETING and optional cookies, not REQUIRED
        if (type == ConsentRecord.ConsentType.TERMS || type == ConsentRecord.ConsentType.PRIVACY || type == ConsentRecord.ConsentType.PERSONAL_DATA) {
            throw ApiException.validation("Cannot revoke required consent");
        }
        var list = consentRepository.findByUserIdAndDocumentId(userId, null);
        // Find latest ACCEPTED for this type
        var toRevoke = consentRepository.findByUserIdAndStatus(userId, ConsentRecord.Status.ACCEPTED).stream()
                .filter(c -> c.getConsentType() == type)
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("No accepted consent to revoke"));
        toRevoke.setStatus(ConsentRecord.Status.REVOKED);
        toRevoke.setRevokedAt(Instant.now());
        return consentRepository.save(toRevoke);
    }

    @Transactional(readOnly = true)
    public List<ConsentRecord> history(UUID userId) {
        return consentRepository.findByUserIdAndStatus(userId, ConsentRecord.Status.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public List<ConsentRecord> requiringReconsent(UUID userId) {
        // Find all published versions that requireReconsent and where user has old version accepted but not current
        return consentRepository.findByUserIdAndStatus(userId, ConsentRecord.Status.REQUIRED);
    }

    @Transactional
    public void checkReconsentForUser(UUID userId) {
        // For each document with published version requiringReconsent, check if user has accepted current version
        var docs = documentRepository.findAll();
        for (var doc : docs) {
            var publishedTmp = versionRepository.findPublishedByDocumentId(doc.getId()).orElse(null);
            if (publishedTmp == null || !publishedTmp.isRequiresReconsent()) continue;
            final var published = publishedTmp;
            var userConsents = consentRepository.findByUserIdAndDocumentId(userId, doc.getId());
            boolean hasCurrent = userConsents.stream()
                    .anyMatch(c -> c.getDocumentVersion() != null && c.getDocumentVersion().getId().equals(published.getId()) && c.getStatus() == ConsentRecord.Status.ACCEPTED);
            if (!hasCurrent) {
                boolean alreadyRequired = userConsents.stream()
                        .anyMatch(c -> c.getStatus() == ConsentRecord.Status.REQUIRED && c.getDocumentVersion() != null && c.getDocumentVersion().getId().equals(published.getId()));
                if (!alreadyRequired) {
                    ConsentRecord req = new ConsentRecord();
                    req.setUser(loadUser(userId));
                    req.setConsentType(mapDocTypeToConsentType(doc.getType()));
                    req.setDocument(doc);
                    req.setDocumentVersion(published);
                    req.setStatus(ConsentRecord.Status.REQUIRED);
                    consentRepository.save(req);
                }
            }
        }
    }

    private ConsentRecord.ConsentType mapDocTypeToConsentType(String docType) {
        return switch (docType.toUpperCase()) {
            case "PRIVACY", "PERSONAL_DATA" -> ConsentRecord.ConsentType.PRIVACY;
            case "TERMS" -> ConsentRecord.ConsentType.TERMS;
            case "COOKIE" -> ConsentRecord.ConsentType.COOKIE_ANALYTICS;
            case "MARKETING" -> ConsentRecord.ConsentType.MARKETING;
            default -> ConsentRecord.ConsentType.PRIVACY;
        };
    }

    private User loadUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    @Deprecated
    private User refUser(UUID id) {
        return loadUser(id);
    }
}
