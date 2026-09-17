package com.okututor.backend.tutor;

import com.okututor.backend.notification.NotificationService;
import com.okututor.backend.notification.NotificationType;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ResumeExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ResumeExpiryScheduler.class);

    private final TutorProfileRepository profileRepository;
    private final NotificationService notificationService;
    private final CacheManager cacheManager;

    public ResumeExpiryScheduler(TutorProfileRepository profileRepository, NotificationService notificationService, CacheManager cacheManager) {
        this.profileRepository = profileRepository;
        this.notificationService = notificationService;
        this.cacheManager = cacheManager;
    }

    // Every hour, expire old resumes (idempotent)
    @Scheduled(fixedDelay = 3600_000, initialDelay = 60_000)
    @Transactional
    public void expireOld() {
        int updated = profileRepository.expireOldProfiles();
        if (updated > 0) {
            log.info("[ResumeExpiry] expired {} profiles", updated);
            // evict public caches so expired resumes disappear from listing/search immediately
            try {
                if (cacheManager.getCache("tutorPublicList") != null) cacheManager.getCache("tutorPublicList").clear();
                if (cacheManager.getCache("tutorSearch") != null) cacheManager.getCache("tutorSearch").clear();
            } catch (Exception e) {
                log.warn("Failed to evict cache after expiry", e);
            }
            // notify expired (idempotent via exists check in service)
            var expired = profileRepository.findExpired();
            for (var p : expired) {
                try {
                    if (!notificationService.existsForEntity("RESUME", p.getId().toString(), NotificationType.RESUME_EXPIRED)) {
                        notificationService.notify(p.getUser().getId(), "Резюме скрыто из поиска. Вы можете бесплатно продлить размещение.", NotificationType.RESUME_EXPIRED, "/dashboard/resume", java.util.Map.of("profileId", p.getId().toString()), "RESUME", p.getId().toString());
                    }
                } catch (Exception e) {
                    log.warn("Failed to notify expiry {}", p.getId(), e);
                }
            }
        }
    }

    // Daily at 9am Bishkek (UTC+6) -> 03:00 UTC
    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    @Transactional(readOnly = true)
    public void notifyExpiring() {
        Instant now = Instant.now();
        Instant in7 = now.plus(7, ChronoUnit.DAYS);
        Instant in1 = now.plus(1, ChronoUnit.DAYS);
        List<TutorProfile> expiring7 = profileRepository.findExpiringSoon(in7);
        for (var p : expiring7) {
            if (p.getExpiresAt() != null && p.getExpiresAt().isBefore(in1.plusSeconds(3600))) continue;
            try {
                if (!notificationService.existsForEntity("RESUME", p.getId().toString() + "_7", NotificationType.RESUME_EXPIRING_7)) {
                    notificationService.notify(p.getUser().getId(), "Ваше резюме скоро перестанет отображаться в поиске. Продлите размещение бесплатно.", NotificationType.RESUME_EXPIRING_7, "/dashboard/resume", java.util.Map.of("profileId", p.getId().toString(), "expiresAt", p.getExpiresAt().toString()), "RESUME", p.getId().toString() + "_7");
                }
            } catch (Exception e) {
                log.warn("Failed to notify expiring 7d {}", p.getId(), e);
            }
        }
        List<TutorProfile> expiring1 = profileRepository.findExpiringSoon(in1.plusSeconds(3600));
        // filter to only those within 24h
        for (var p : expiring1) {
            if (p.getExpiresAt() == null || p.getExpiresAt().isBefore(now) || p.getExpiresAt().isAfter(in1.plusSeconds(3600))) continue;
            try {
                if (!notificationService.existsForEntity("RESUME", p.getId().toString() + "_1", NotificationType.RESUME_EXPIRING_1)) {
                    notificationService.notify(p.getUser().getId(), "Завтра срок размещения вашего резюме закончится.", NotificationType.RESUME_EXPIRING_1, "/dashboard/resume", java.util.Map.of("profileId", p.getId().toString()), "RESUME", p.getId().toString() + "_1");
                }
            } catch (Exception e) {
                log.warn("Failed to notify expiring 1d {}", p.getId(), e);
            }
        }
    }
}
