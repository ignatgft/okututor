package com.okututor.backend.common.util;

/**
 * Утилита для проверки Google-аватаров.
 * Вынесена из 3 дублирующих мест (TutorProfile, TutorProfileService, TutorProfileMapper)
 * для единого правила фильтрации.
 */
public final class PhotoUrlUtils {
    private PhotoUrlUtils() {}

    public static boolean isGooglePhoto(String url) {
        if (url == null) return false;
        String l = url.toLowerCase();
        return l.contains("googleusercontent.com") || l.contains("lh3.google");
    }
}
