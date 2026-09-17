package com.okututor.backend.config;

import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Разовый ремонт legacy-данных: старый renew-баг накапливал дополнительные
 * 30 дней от текущего expiresAt, из-за чего резюме могло оставаться активным
 * 60/90/150+ дней вместо ровно 30 после публикации.
 *
 * Профиль остаётся активным максимум 30 дней с последней публикации (publishedAt + 30 дней)
 * независимо от того, сколько раз его продлевали раньше.
 */
@Component
public class ExpiryDataRepair implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ExpiryDataRepair.class);

    private final TutorProfileRepository profileRepository;

    public ExpiryDataRepair(TutorProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        List<TutorProfile> stacked = profileRepository.findStackedExpiry();
        if (stacked.isEmpty()) {
            return;
        }
        int fixed = 0;
        for (TutorProfile p : stacked) {
            var capped = p.getPublishedAt().plusSeconds(30L * 24 * 3600);
            if (p.getExpiresAt() != null && p.getExpiresAt().isAfter(capped)) {
                p.setExpiresAt(capped);
                profileRepository.save(p);
                fixed++;
            }
        }
        if (fixed > 0) {
            log.info("[ExpiryRepair] capped {} PUBLISHED profile(s) to publishedAt + 30 days (legacy stacking fix)", fixed);
        }
    }
}