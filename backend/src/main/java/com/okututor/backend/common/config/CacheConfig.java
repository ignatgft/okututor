package com.okututor.backend.common.config;

import java.time.Duration;
import java.util.Optional;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

@Configuration
@EnableCaching
public class CacheConfig extends org.springframework.cache.annotation.CachingConfigurerSupport {

    @Override
    public org.springframework.cache.interceptor.CacheErrorHandler errorHandler() {
        return new org.springframework.cache.interceptor.CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                org.slf4j.LoggerFactory.getLogger(CacheConfig.class).warn("Cache get error {} key {}: {}", cache.getName(), key, exception.getMessage());
            }
            @Override
            public void handleCachePutError(RuntimeException exception, org.springframework.cache.Cache cache, Object key, Object value) {
                org.slf4j.LoggerFactory.getLogger(CacheConfig.class).warn("Cache put error {} key {}: {}", cache.getName(), key, exception.getMessage());
            }
            @Override
            public void handleCacheEvictError(RuntimeException exception, org.springframework.cache.Cache cache, Object key) {
                org.slf4j.LoggerFactory.getLogger(CacheConfig.class).warn("Cache evict error {} key {}: {}", cache.getName(), key, exception.getMessage());
            }
            @Override
            public void handleCacheClearError(RuntimeException exception, org.springframework.cache.Cache cache) {
                org.slf4j.LoggerFactory.getLogger(CacheConfig.class).warn("Cache clear error {}: {}", cache.getName(), exception.getMessage());
            }
        };
    }

    @Bean
    public CacheManager cacheManager(Optional<RedisConnectionFactory> redisFactory) {
        if (redisFactory.isPresent()) {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
            mapper.disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
            // tolerate lazy proxies / unknown types for cached DTOs
            mapper.configure(com.fasterxml.jackson.databind.SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
            GenericJackson2JsonRedisSerializer jsonSer = new GenericJackson2JsonRedisSerializer(mapper);
            RedisCacheConfiguration defaultCfg = RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(2))
                    .disableCachingNullValues()
                    .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSer));
            return RedisCacheManager.builder(redisFactory.get())
                    .cacheDefaults(defaultCfg)
                    .withCacheConfiguration("tutorPublicList", defaultCfg.entryTtl(Duration.ofMinutes(1)))
                    .withCacheConfiguration("tutorSearch", defaultCfg.entryTtl(Duration.ofSeconds(45)))
                    .withCacheConfiguration("tutorPopular", defaultCfg.entryTtl(Duration.ofMinutes(1)))
                    .withCacheConfiguration("referenceData", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("seoSitemap", defaultCfg.entryTtl(Duration.ofMinutes(10)))
                    .withCacheConfiguration("cities", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("subjects", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("levels", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("tutorCard", defaultCfg.entryTtl(Duration.ofMinutes(5)))
                    .build();
        }
        // fallback in-memory (dev without Redis) — TTL handled via manual evict, prevents OOM via no allEntries on views
        ConcurrentMapCacheManager manager = new ConcurrentMapCacheManager(
                "tutorPublicList", "tutorSearch", "tutorPopular", "referenceData", "seoSitemap", "cities", "subjects", "levels", "tutorCard");
        return manager;
    }
}
