package com.okututor.backend.common.config;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.env.EnvironmentPostProcessor;import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;

/**
 * Стартовая проверка production-окружения (#20 спеки секретов):
 * приложение с профилем prod НЕ запустится, если отсутствуют обязательные
 * переменные или JWT_SECRET слабый/равен известному dev-дефолту.
 *
 * Зарегистрирован как EnvironmentPostProcessor (META-INF/spring.factories)
 * с порядком сразу после загрузки конфиг-файлов — падаем ДО создания бинов
 * с понятным списком проблем вместо стектрейса из недр Hibernate/JWT.
 */
public class ProdEnvValidator implements EnvironmentPostProcessor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(ProdEnvValidator.class);

    private static final List<String> FORBIDDEN_JWT_SECRETS = List.of(
            "dev-only-secret-change-me-0123456789abcdef0123456789abcdef",
            "devsecret-change-me-012345678901234",
            "placeholder-google-client-id",
            "placeholder-google-client-secret",
            "change-me-in-staging-and-prod-0123456789abcdef",
            "CHANGE_ME_TO_LONG_RANDOM_SECRET",
            "devkey",
            "test-secret-do-not-use-in-production-0123456789abcdef");

    private static final int MIN_JWT_SECRET_LENGTH = 32;

    /** после ConfigDataEnvironmentPostProcessor, чтобы видеть application*.yml и .env. */
    @Override
    public int getOrder() {
        return ConfigDataEnvironmentPostProcessor.ORDER + 10;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (environment.matchesProfiles("test")) {
            return;
        }
        boolean isProd = environment.matchesProfiles("prod");

        List<String> problems = new ArrayList<>();

        if (isProd) {
            require(environment, problems,
                    "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD",
                    "FRONTEND_URL", "APP_CORS_ORIGINS", "MAIL_FROM");

            String cors = environment.getProperty("APP_CORS_ORIGINS", "");
            if (cors.contains("*")) {
                problems.add("APP_CORS_ORIGINS must not contain wildcard '*' in production — enumerate explicit origins");
            }
            if (cors.contains("http://")) {
                problems.add("APP_CORS_ORIGINS must use https in production (found http://)");
            }
            String frontend = environment.getProperty("FRONTEND_URL", "");
            if (frontend.startsWith("http://")) {
                problems.add("FRONTEND_URL must use https in production");
            }

            String jwt = environment.getProperty("app.jwt.secret", "");
            if (jwt.isBlank()) {
                problems.add("JWT_SECRET is required in production");
            } else {
                if (jwt.length() < MIN_JWT_SECRET_LENGTH) {
                    problems.add("JWT_SECRET must be at least %d characters (got %d)"
                            .formatted(MIN_JWT_SECRET_LENGTH, jwt.length()));
                }
                if (FORBIDDEN_JWT_SECRETS.contains(jwt)) {
                    problems.add("JWT_SECRET equals a known dev/test default - generate a fresh random secret");
                }
            }
        }

        String livekitKey = environment.getProperty("LIVEKIT_API_KEY", "");
        String livekitSecret = environment.getProperty("LIVEKIT_API_SECRET", "");
        if (isProd) {
            if (livekitKey.isBlank() || livekitSecret.isBlank()) {
                log.warn("PROD: LIVEKIT_API_KEY/LIVEKIT_API_SECRET not set - lesson meetings will fail at runtime");
            } else if (livekitSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
                problems.add("LIVEKIT_API_SECRET must be at least 32 bytes in production (got %d)"
                        .formatted(livekitSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length));
            }
            if (livekitKey.isBlank() && !livekitSecret.isBlank()
                    || !livekitKey.isBlank() && livekitSecret.isBlank()) {
                problems.add("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set together in production");
            }
        }

        if (!problems.isEmpty()) {
            String header = isProd ? "Production environment validation failed:\n  - "
                    : "Environment validation failed:\n  - ";
            String message = header + String.join("\n  - ", problems)
                    + "\nSet variables via server environment (never commit .env).";
            log.error(message);
            throw new IllegalStateException(message);
        }
        if (isProd) log.info("PROD environment validation passed");
    }

    private static void require(Environment env, List<String> problems, String... keys) {
        for (String key : keys) {
            String value = env.getProperty(key);
            if (value == null || value.isBlank()) {
                problems.add(key + " is required in production");
            }
        }
    }
}
