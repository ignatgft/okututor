package com.okututor.backend.media;

import com.okututor.backend.common.error.ApiException;
import java.util.Locale;

/** тип медиа-объекта: определяет pipeline оптимизации и ключ в storage. */
public enum MediaKind {
    AVATAR("users", "avatar"),
    COURSE_COVER("courses", "cover"),
    PROFILE("tutors", "profile"),
    /** основной файл вложения сообщения (изображение или документ). */
    MESSAGE_ATTACHMENT("messages", "attachment"),
    /** миниатюра изображения-вложения сообщения. */
    MESSAGE_THUMBNAIL("messages", "attachment-thumb");

    private final String keyPrefix;
    private final String keySegment;

    MediaKind(String keyPrefix, String keySegment) {
        this.keyPrefix = keyPrefix;
        this.keySegment = keySegment;
    }

    /** users/{ownerId}/avatar/{uuid}.webp и т.п. */
    public String objectKey(java.util.UUID ownerId, String extension) {
        return "%s/%s/%s/%s.%s".formatted(keyPrefix, ownerId, keySegment,
                java.util.UUID.randomUUID(), extension);
    }

    /** Приватный вид медиа (доступ контролируется авторизацией, а не публичным CDN). */
    public boolean isPrivate() {
        return "messages".equals(keyPrefix) || "support".equals(keyPrefix)
                || "chat".equals(keyPrefix) || "private".equals(keyPrefix);
    }

    /** Единая безопасная проверка приватного objectKey с предварительной валидацией и нормализацией. */
    public static boolean isPrivateKey(String key) {
        return isNormalizedPrivateKey(normalizeObjectKey(key));
    }

    /** Проверка приватного префикса для уже нормализованного и провалидированного ключа. */
    public static boolean isNormalizedPrivateKey(String normalizedKey) {
        if (normalizedKey == null || normalizedKey.isEmpty()) {
            return false;
        }
        String lower = normalizedKey.toLowerCase(Locale.ROOT);
        return lower.equals("messages") || lower.startsWith("messages/")
                || lower.equals("support") || lower.startsWith("support/")
                || lower.equals("chat") || lower.startsWith("chat/")
                || lower.equals("private") || lower.startsWith("private/");
    }

    /**
     * Валидирует и нормализует objectKey: допускает максимум один ведущий '/',
     * запрещает traversal (.. и .), обратные слэши, повторные слэши, percent-encoding и спецсимволы.
     */
    public static String normalizeObjectKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw ApiException.validation("Invalid media key");
        }
        // Не выполняем повторную URL-декодировку; отклоняем '%' (percent/double encoding) и опасные разделители явно.
        for (int i = 0; i < rawKey.length(); i++) {
            char c = rawKey.charAt(i);
            if (c <= 0x1F || c >= 0x7F || Character.isWhitespace(c)
                    || c == '\\' || c == '%' || c == ';' || c == '?' || c == '#' || c == ':') {
                throw ApiException.validation("Invalid media key");
            }
        }
        if (rawKey.contains("//")) {
            throw ApiException.validation("Invalid media key");
        }
        String normalized = rawKey.startsWith("/") ? rawKey.substring(1) : rawKey;
        if (normalized.isEmpty() || normalized.startsWith("/") || normalized.endsWith("/")) {
            throw ApiException.validation("Invalid media key");
        }
        if (normalized.contains("..")) {
            throw ApiException.validation("Invalid media key");
        }
        for (String segment : normalized.split("/")) {
            if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
                throw ApiException.validation("Invalid media key");
            }
        }
        return normalized;
    }
}
