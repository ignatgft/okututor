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
            // Store DTOs only, never PageImpl — type-safe JSON
            GenericJackson2JsonRedisSerializer jsonSer = new GenericJackson2JsonRedisSerializer(mapper);
            RedisCacheConfiguration defaultCfg = RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(2))
                    .disableCachingNullValues()
                    .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSer));
            // jitter: base TTL + 0-15% to avoid thundering herd on expiry
            java.util.concurrent.ThreadLocalRandom rnd = java.util.concurrent.ThreadLocalRandom.current();
            return RedisCacheManager.builder(redisFactory.get())
                    .cacheDefaults(defaultCfg)
                    .withCacheConfiguration("tutorPublicList:v2", defaultCfg.entryTtl(Duration.ofSeconds(60 + rnd.nextInt(10))))
                    .withCacheConfiguration("tutorSearch:v2", defaultCfg.entryTtl(Duration.ofSeconds(45 + rnd.nextInt(8))))
                    .withCacheConfiguration("tutorPopular:v2", defaultCfg.entryTtl(Duration.ofSeconds(60 + rnd.nextInt(10))))
                    .withCacheConfiguration("referenceData", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("seoSitemap", defaultCfg.entryTtl(Duration.ofMinutes(10)))
                    .withCacheConfiguration("cities", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("subjects", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("levels", defaultCfg.entryTtl(Duration.ofHours(1)))
                    .withCacheConfiguration("tutorCard", defaultCfg.entryTtl(Duration.ofMinutes(5)))
                    .enableStatistics()
                    .build();
        }
        // fallback Caffeine in-memory (dev without Redis) — bounded, TTL, prevents OOM at 100k keys
        com.github.benmanes.caffeine.cache.Caffeine<Object, Object> caffeine = com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                .maximumSize(2000)
                .expireAfterWrite(Duration.ofMinutes(1))
                .recordStats();
        org.springframework.cache.caffeine.CaffeineCacheManager caffeineManager = new org.springframework.cache.caffeine.CaffeineCacheManager();
        caffeineManager.setCaffeine(caffeine);
        caffeineManager.setCacheNames(java.util.List.of("tutorPublicList:v2", "tutorSearch:v2", "tutorPopular:v2", "referenceData", "seoSitemap", "cities", "subjects", "levels", "tutorCard"));
        return caffeineManager;
    }
}
