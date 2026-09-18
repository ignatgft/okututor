package com.okututor.backend.common.ratelimit;

import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnBean(StringRedisTemplate.class)
public class RedisRateLimiter implements RateLimiter {

    private final StringRedisTemplate redis;

    public RedisRateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    private static final org.springframework.data.redis.core.script.DefaultRedisScript<Long> LUA =
            new org.springframework.data.redis.core.script.DefaultRedisScript<>(
                    "local c = redis.call('INCR', KEYS[1]); if c==1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end; return c;", Long.class);

    @Override
    public boolean tryAcquire(String key, int limit, Duration window) {
        String redisKey = "rl:" + key;
        // hash PII (email) to avoid plaintext in Redis MONITOR/KEYS
        String safeKey = redisKey.length() > 200 ? "rl:hash:" + org.springframework.util.DigestUtils.md5DigestAsHex(key.getBytes()) : redisKey;
        String bucketKey = safeKey + ":" + (System.currentTimeMillis() / window.toMillis());
        Long count = redis.execute(LUA, java.util.List.of(bucketKey), String.valueOf(limit), String.valueOf(window.toMillis()));
        return count == null || count <= limit;
    }
}
