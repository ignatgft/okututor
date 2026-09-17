package com.okututor.backend.tutor;

/**
 * Константы кешей для TutorProfile. Устраняет дублирование @CacheEvict в 11 местах.
 */
public final class TutorCacheConstants {
    private TutorCacheConstants() {}
    public static final String[] ALL_TUTOR_CACHES = {"tutorPublicList", "tutorSearch", "tutorPopular"};
    public static final String POPULAR = "tutorPopular";
    public static final String PUBLIC_LIST = "tutorPublicList";
    public static final String SEARCH = "tutorSearch";
}
