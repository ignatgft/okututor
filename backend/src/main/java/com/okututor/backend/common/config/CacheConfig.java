package com.okututor.backend.common.config;

import java.time.Duration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // Simple in-memory cache for reference data and public tutor lists.
        // For prod with multiple instances, switch to RedisCacheManager via app.cache.type=redis
        ConcurrentMapCacheManager manager = new ConcurrentMapCacheManager(
                "tutorPublicList", "tutorSearch", "referenceData", "seoSitemap", "cities", "subjects", "levels");
        return manager;
    }
}
