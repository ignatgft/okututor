package com.okututor.backend.media;

import com.okututor.backend.common.config.AppProperties;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * периодическая сверка: удаляет media-объекты без владельца и курса
 * старше grace period (#40). Включается флагом app.media.orphan-cleanup-enabled.
 */
@Component
@ConditionalOnProperty(prefix = "app.media", name = "orphan-cleanup-enabled", havingValue = "true")
public class OrphanMediaCleaner {

    private static final Logger log = LoggerFactory.getLogger(OrphanMediaCleaner.class);

    private final MediaObjectRepository mediaObjects;
    private final ObjectStorage storage;
    private final AppProperties properties;

    public OrphanMediaCleaner(MediaObjectRepository mediaObjects,
                              ObjectStorage storage,
                              AppProperties properties) {
        this.mediaObjects = mediaObjects;
        this.storage = storage;
        this.properties = properties;
    }

    @Scheduled(cron = "${app.media.orphan-cleanup-cron:0 0 4 * * *}")
    public void cleanup() {
        Instant threshold = Instant.now().minus(properties.getMedia().getOrphanGrace());
        // Original orphans: no owner, no course
        var orphans = mediaObjects.findByOwnerIsNullAndCourseIdIsNullAndCreatedAtBefore(threshold);
        // Also handle leaked avatars where owner exists but avatarUrl no longer points to object
        var avatarOrphans = mediaObjects.findByOwnerIsNotNullAndCreatedAtBefore(threshold);
        var allOrphans = new java.util.ArrayList<MediaObject>(orphans);
        for (var m : avatarOrphans) {
            if (m.getOwner() != null && m.getOwner().getAvatarUrl() != null && !m.getOwner().getAvatarUrl().equals(m.getPublicUrl())) {
                // Owner's avatar no longer points to this object -> orphan
                if (!allOrphans.contains(m)) allOrphans.add(m);
            }
        }
        log.info("media: orphan cleanup found {} candidates older than {} ({} pure orphans, {} leaked avatars)", allOrphans.size(), threshold, orphans.size(), allOrphans.size() - orphans.size());
        for (MediaObject orphan : allOrphans) {
            try {
                storage.delete(orphan.getObjectKey());
            } catch (RuntimeException e) {
                log.warn("media: orphan {} already absent from storage: {}", orphan.getObjectKey(), e.getMessage());
            }
        }
        if (!allOrphans.isEmpty()) {
            mediaObjects.deleteAllInBatch(allOrphans);
        }
    }
}
