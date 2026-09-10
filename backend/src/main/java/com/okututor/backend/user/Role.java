package com.okututor.backend.user;

/**
 * Marketplace unified model: USER + ADMIN.
 * Legacy roles STUDENT/TUTOR kept for backward compatibility (DB, old tokens, legacy EdTech modules).
 * New code must use USER/ADMIN only.
 */
public enum Role {
    USER,
    ADMIN,
    SUPER_ADMIN,
    /** @deprecated LEGACY — use USER; kept for DB migration and old JWTs */
    @Deprecated
    STUDENT,
    /** @deprecated LEGACY — use USER; kept for DB migration and old JWTs */
    @Deprecated
    TUTOR,
    /** @deprecated LEGACY — use USER */
    @Deprecated
    TEACHER;

    public boolean isLegacyMarketplace() {
        return this == STUDENT || this == TUTOR || this == TEACHER;
    }

    public boolean isUserLike() {
        return this == USER || this == STUDENT || this == TUTOR || this == TEACHER;
    }

    public Role normalized() {
        if (isLegacyMarketplace()) return USER;
        if (this == SUPER_ADMIN) return ADMIN;
        return this;
    }
}
