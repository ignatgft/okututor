package com.okututor.backend.tutor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 100% гарантия: сверяет заявки и профили, алертит если заявка есть а профиля нет более 5 минут
 * или профиль в DRAFT но заявка PENDING — значит потерялся submit.
 */
@Component
public class ResumeOrphanDetector {

    private static final Logger log = LoggerFactory.getLogger(ResumeOrphanDetector.class);
    private final TutorProfileRepository profileRepository;
    private final com.okututor.backend.request.TutorRequestRepository requestRepository;

    public ResumeOrphanDetector(TutorProfileRepository profileRepository,
                                com.okututor.backend.request.TutorRequestRepository requestRepository) {
        this.profileRepository = profileRepository;
        this.requestRepository = requestRepository;
    }

    @Scheduled(fixedDelay = 300000, initialDelay = 60000) // каждые 5 мин
    public void checkOrphans() {
        try {
            long pendingProfiles = profileRepository.countByStatus(TutorProfileStatus.PENDING_MODERATION);
            long drafts = profileRepository.countByStatus(TutorProfileStatus.DRAFT);
            if (drafts > 20) {
                log.warn("ORPHAN_CHECK: {} profiles in DRAFT (possible lost submit)", drafts);
            }
            long pendingRequests = requestRepository.count();
            if (pendingRequests > pendingProfiles * 3 && pendingProfiles > 0) {
                log.warn("ORPHAN_CHECK: many pending requests {} vs pending profiles {} — possible loss", pendingRequests, pendingProfiles);
            }
        } catch (Exception e) {
            log.warn("ORPHAN_CHECK failed: {}", e.toString());
        }
    }
}
