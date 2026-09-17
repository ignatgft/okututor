package com.okututor.backend.share;

import com.okututor.backend.common.config.AppProperties;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.common.error.ErrorCodes;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileLanguageRepository;
import com.okututor.backend.tutor.TutorProfileLevelRepository;
import com.okututor.backend.tutor.TutorProfileMapper;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.tutor.TutorProfileSubjectRepository;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeShareService {

    private static final long SHARE_TTL_SECONDS = 30L * 24 * 3600; // 30 days
    private final SecureRandom random = new SecureRandom();

    private final ResumeShareRepository shareRepository;
    private final TutorProfileRepository profileRepository;
    private final TutorProfileSubjectRepository subjectRepository;
    private final TutorProfileLevelRepository levelRepository;
    private final TutorProfileLanguageRepository languageRepository;
    private final AppProperties properties;

    public ResumeShareService(ResumeShareRepository shareRepository,
                              TutorProfileRepository profileRepository,
                              TutorProfileSubjectRepository subjectRepository,
                              TutorProfileLevelRepository levelRepository,
                              TutorProfileLanguageRepository languageRepository,
                              AppProperties properties) {
        this.shareRepository = shareRepository;
        this.profileRepository = profileRepository;
        this.subjectRepository = subjectRepository;
        this.levelRepository = levelRepository;
        this.languageRepository = languageRepository;
        this.properties = properties;
    }

    /** Creates a shareable link for the resume owner. Reuses an existing active link (idempotent). */
    @Transactional
    public ShareResponse create(UUID profileId, UUID userId) {
        TutorProfile p = ownerProfile(profileId, userId);
        return shareRepository.findForOwner(profileId, userId)
                .filter(s -> s.getExpiresAt() == null || s.getExpiresAt().isAfter(Instant.now()))
                .map(this::toResponse)
                .orElseGet(() -> {
                    ResumeShare s = new ResumeShare();
                    s.setTutorProfile(p);
                    s.setCreatedBy(new com.okututor.backend.user.User());
                    s.getCreatedBy().setId(userId);
                    s.setToken(newToken());
                    s.setExpiresAt(Instant.now().plusSeconds(SHARE_TTL_SECONDS));
                    return toResponse(shareRepository.save(s));
                });
    }

    /** Current active share for a resume owner, if any. */
    @Transactional(readOnly = true)
    public ShareResponse getForOwner(UUID profileId, UUID userId) {
        ownerProfile(profileId, userId);
        return shareRepository.findForOwner(profileId, userId)
                .filter(s -> s.getExpiresAt() == null || s.getExpiresAt().isAfter(Instant.now()))
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public void revoke(UUID profileId, UUID userId) {
        ownerProfile(profileId, userId);
        shareRepository.deleteByTutorProfileIdAndCreatedById(profileId, userId);
    }

    /** Public view of a shared resume. Phone is hidden, exactly as the owner preview renders public form. */
    @Transactional
    public ShareViewResponse viewByToken(String token, UUID viewerId) {
        ResumeShare s = shareRepository.findByTokenWithProfile(token)
                .orElseThrow(() -> ApiException.notFound("Share link not found"));
        if (s.getExpiresAt() != null && s.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.gone(ErrorCodes.SHARE_EXPIRED, "Share link has expired");
        }
        TutorProfile p = s.getTutorProfile();
        if (p.getStatus() == TutorProfileStatus.DELETED) {
            throw ApiException.notFound("Share link not found");
        }
        s.setViewCount(s.getViewCount() + 1);
        shareRepository.save(s);
        TutorProfileResponse resume = TutorProfileMapper.toResponse(p,
                subjectRepository.findByProfileId(p.getId()).stream().map(com.okututor.backend.tutor.TutorProfileSubject::getSubject).toList(),
                levelRepository.findByProfileId(p.getId()).stream().map(com.okututor.backend.tutor.TutorProfileLevel::getLevel).toList(),
                languageRepository.findByProfileId(p.getId()).stream().map(com.okututor.backend.tutor.TutorProfileLanguage::getLanguage).toList(),
                false);
        return new ShareViewResponse(toResponse(s), resume);
    }

    private TutorProfile ownerProfile(UUID profileId, UUID userId) {
        TutorProfile p = profileRepository.findByIdWithLocation(profileId)
                .orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (p.getStatus() == TutorProfileStatus.DELETED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (!p.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Not your profile");
        }
        return p;
    }

    private ShareResponse toResponse(ResumeShare s) {
        return new ShareResponse(s.getId(), s.getToken(), buildUrl(s.getToken()),
                s.getCreatedAt(), s.getExpiresAt(), s.getViewCount());
    }

    private String buildUrl(String token) {
        String base = properties.getFrontendUrl();
        if (base == null || base.isBlank()) return "/share/" + token;
        return base.replaceAll("/+$", "") + "/share/" + token;
    }

    private String newToken() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}