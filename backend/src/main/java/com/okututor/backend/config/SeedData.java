package com.okututor.backend.config;

import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Минимальный bootstrap сид — создаёт только обязательных администраторов из ENV.
 * Никаких мок-курсов, бронирований, уведомлений, демо-учеников/репетиторов.
 * Включается ТОЛЬКО если app.seed.enabled=true (по умолчанию false, см. application.yml).
 * Пароли ОБЯЗАТЕЛЬНО задаются через ENV, без хардкод-фолбэков.
 */
@Component
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = false)
public class SeedData implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedData.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SeedData(UserRepository userRepository,
                    PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        created += provisionAdmin("super@admin.test", "SEED_ADMIN_PASSWORD", Role.SUPER_ADMIN);
        created += provisionAdmin("support@admin.test", "SEED_SUPPORT_PASSWORD", Role.ADMIN);
        // Dev admin for local development — uses Support#12345 if ENV not set (only for dev)
        created += provisionDevAdmin("dev.admin@test.com", "SEED_SUPPORT_PASSWORD", "Support#12345", Role.ADMIN);
        created += provisionDevAdmin("dev.super@test.com", "SEED_ADMIN_PASSWORD", "Admin#12345", Role.SUPER_ADMIN);
        if (created > 0) {
            log.info("[Seed] provisioned {} admin account(s)", created);
        } else {
            log.info("[Seed] admin accounts present, skip");
        }
    }

    private int provisionAdmin(String email, String envVar, Role role) {
        String rawPassword = System.getenv(envVar);
        if (rawPassword == null || rawPassword.isBlank()) {
            String prop = System.getProperty(envVar);
            if (prop != null && !prop.isBlank()) rawPassword = prop;
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            log.warn("[Seed] {} not set — skip provisioning {}", envVar, email);
            return 0;
        }
        if (rawPassword.length() < 12) {
            log.warn("[Seed] {} too short (<12) — refuse to provision {}", envVar, email);
            return 0;
        }
        var existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            boolean needsSave = false;
            if (!existing.isVerified()) { existing.setVerified(true); needsSave = true; }
            if (existing.isBlocked()) { existing.setBlocked(false); needsSave = true; }
            if (existing.getRole() != role) { existing.setRole(role); needsSave = true; }
            if (needsSave) userRepository.save(existing);
            return 0;
        }
        User u = new User();
        u.setEmail(email);
        u.setRole(role);
        u.setVerified(true);
        u.setBlocked(false);
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        String[] parts = email.split("@")[0].split("\\.");
        if (parts.length >= 1) u.setFirstName(capitalize(parts[0]));
        if (parts.length >= 2) u.setLastName(capitalize(parts[1]));
        userRepository.save(u);
        log.info("[Seed] created {} as {}", email, role);
        return 1;
    }

    private int provisionDevAdmin(String email, String envVar, String devFallback, Role role) {
        String rawPassword = System.getenv(envVar);
        if (rawPassword == null || rawPassword.isBlank()) {
            String prop = System.getProperty(envVar);
            if (prop != null && !prop.isBlank()) rawPassword = prop;
        }
        // For dev accounts, allow fallback only if not in prod
        if ((rawPassword == null || rawPassword.isBlank()) && !isProdProfile()) {
            rawPassword = devFallback;
            log.info("[Seed] using dev fallback for {} (not for prod)", email);
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            log.warn("[Seed] {} not set — skip provisioning {}", envVar, email);
            return 0;
        }
        var existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            boolean needsSave = false;
            if (!existing.isVerified()) { existing.setVerified(true); needsSave = true; }
            if (existing.isBlocked()) { existing.setBlocked(false); needsSave = true; }
            if (existing.getRole() != role) { existing.setRole(role); needsSave = true; }
            // Ensure dev password is set if not matching fallback
            if (!passwordEncoder.matches(devFallback, existing.getPasswordHash()) && !passwordEncoder.matches(rawPassword, existing.getPasswordHash())) {
                existing.setPasswordHash(passwordEncoder.encode(rawPassword));
                needsSave = true;
            }
            if (needsSave) userRepository.save(existing);
            return 0;
        }
        User u = new User();
        u.setEmail(email);
        u.setRole(role);
        u.setVerified(true);
        u.setBlocked(false);
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        String[] parts = email.split("@")[0].split("\\.");
        if (parts.length >= 1) u.setFirstName(capitalize(parts[0]));
        if (parts.length >= 2) u.setLastName(capitalize(parts[1]));
        userRepository.save(u);
        log.info("[Seed] created {} as {}", email, role);
        return 1;
    }

    private boolean isProdProfile() {
        try {
            String profiles = System.getProperty("spring.profiles.active", "");
            if (profiles.contains("prod")) return true;
            String envProfiles = System.getenv("SPRING_PROFILES_ACTIVE");
            return envProfiles != null && envProfiles.contains("prod");
        } catch (Exception e) {
            return false;
        }
    }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return s.substring(0,1).toUpperCase() + s.substring(1).toLowerCase();
    }
}
