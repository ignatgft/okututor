package com.okututor.backend.security;

import com.okututor.backend.media.MediaService;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.io.InputStream;
import java.net.URL;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class GoogleProvisioner {

    private static final Logger log = LoggerFactory.getLogger(GoogleProvisioner.class);

    private final UserRepository userRepository;
    private final MediaService mediaService;

    public GoogleProvisioner(UserRepository userRepository, MediaService mediaService) {
        this.userRepository = userRepository;
        this.mediaService = mediaService;
    }

    /**
     * Привязывает существующий LOCAL-аккаунт по email или создаёт новый
     * верифицированный. Роль при OAuth-регистрации ВСЕГДА STUDENT: стать
     * репетитором можно только через заявку и одобрение админом
     * (STUDENT -> заявка -> ADMIN -> APPROVED -> TUTOR).
     */
    @Transactional
    public User provision(OAuth2User oAuth2User) {
        String subject = oAuth2User.getName();
        String email = Optional.ofNullable(oAuth2User.getAttribute("email"))
                .map(Object::toString)
                .map(String::toLowerCase)
                .orElseThrow(() -> new IllegalStateException("Google profile has no email"));

        User user = userRepository.findByEmail(email).orElseGet(User::new);
        if (user.getId() == null) {
            user.setEmail(email);
            Object givenName = oAuth2User.getAttribute("given_name");
            Object familyName = oAuth2User.getAttribute("family_name");
            user.setFirstName(givenName != null ? givenName.toString() : null);
            user.setLastName(familyName != null ? familyName.toString() : null);
            // защита от эскалации привилегий: роль из query-параметра игнорируется
            // Marketplace: все новые OAuth-пользователи — USER (может создать резюме)
            user.setRole(Role.USER);
            user.setVerified(true); // email подтверждён провайдером
            user.setProvider(User.AuthProvider.GOOGLE);
        }
        user.setGoogleSubject(subject);
        // Try to import Google avatar if user has no avatar yet
        Object pictureObj = oAuth2User.getAttribute("picture");
        if (pictureObj != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
            String pictureUrl = pictureObj.toString();
            if (!isAllowedPictureUrl(pictureUrl)) {
                log.warn("Blocked Google avatar import for {} — disallowed URL: {}", user.getEmail(), pictureUrl);
            } else try {
                URL url = new URL(pictureUrl);
                java.net.URLConnection conn = url.openConnection();
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(5000);
                conn.setUseCaches(false);
                try (InputStream in = conn.getInputStream()) {
                    byte[] bytes = in.readAllBytes();
                    if (bytes.length > 0 && bytes.length < 5 * 1024 * 1024) {
                        String filename = "google-avatar.jpg";
                        // Simple in-memory MultipartFile without spring-test dependency
                        org.springframework.web.multipart.MultipartFile file = new org.springframework.web.multipart.MultipartFile() {
                            @Override public String getName() { return "file"; }
                            @Override public String getOriginalFilename() { return filename; }
                            @Override public String getContentType() { return "image/jpeg"; }
                            @Override public boolean isEmpty() { return bytes.length == 0; }
                            @Override public long getSize() { return bytes.length; }
                            @Override public byte[] getBytes() { return bytes; }
                            @Override public InputStream getInputStream() { return new java.io.ByteArrayInputStream(bytes); }
                            @Override public void transferTo(java.io.File dest) throws java.io.IOException { try (var out = new java.io.FileOutputStream(dest)) { out.write(bytes); } }
                        };
                        mediaService.updateAvatar(user, file);
                        log.info("Imported Google avatar for user {} from {}", user.getEmail(), pictureUrl);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to import Google avatar for {}: {}", user.getEmail(), e.getMessage());
            }
        }
        return userRepository.save(user);
    }

    private static boolean isAllowedPictureUrl(String url) {
        try {
            java.net.URL u = new java.net.URL(url);
            String scheme = u.getProtocol();
            if (!"https".equalsIgnoreCase(scheme)) return false;
            String host = u.getHost().toLowerCase(java.util.Locale.ROOT);
            // allow only Google avatar hosts
            if (host.equals("lh3.googleusercontent.com") || host.equals("lh3.google.com")
                    || host.endsWith(".googleusercontent.com") || host.endsWith(".ggpht.com")) {
                // extra SSRF defense: block private IPs even for allowed hosts (DNS rebinding)
                try {
                    java.net.InetAddress addr = java.net.InetAddress.getByName(host);
                    if (addr.isLoopbackAddress() || addr.isLinkLocalAddress() || addr.isSiteLocalAddress()) {
                        return false;
                    }
                    byte[] ip = addr.getAddress();
                    // 169.254.0.0/16
                    if (ip.length == 4 && ip[0] == (byte)169 && ip[1] == (byte)254) return false;
                } catch (Exception ignored) {}
                return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
