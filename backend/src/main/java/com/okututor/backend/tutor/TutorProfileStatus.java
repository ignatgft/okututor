package com.okututor.backend.tutor;

public enum TutorProfileStatus {
    DRAFT("Черновик"),
    PENDING_MODERATION("На модерации"),
    PUBLISHED("Опубликовано"),
    ACTIVE("Активно"),
    REJECTED("Отклонено"),
    SUSPENDED("Приостановлено"),
    EXPIRED("Истекло"),
    HIDDEN("Скрыто"),
    ARCHIVED("В архиве"),
    DELETED("Удалено");

    private final String label;

    TutorProfileStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public boolean isActive() {
        return this == PUBLISHED || this == ACTIVE;
    }

    public static TutorProfileStatus fromString(String raw) {
        if (raw == null) return null;
        String s = raw.trim().toUpperCase();
        if ("ACTIVE".equals(s)) return PUBLISHED;
        if ("PENDING".equals(s)) return PENDING_MODERATION;
        if ("APPROVED".equals(s)) return PUBLISHED;
        return valueOf(s);
    }
}
