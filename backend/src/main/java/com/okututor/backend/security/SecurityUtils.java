package com.okututor.backend.security;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.user.Role;

/**
 * Централизованные проверки аутентификации/авторизации.
 * Устраняет дублирование requireAuth/requireAdmin в 12 контроллерах.
 */
public final class SecurityUtils {
    private SecurityUtils() {}

    public static void requireAuth(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
    }

    public static void requireAdmin(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        if (!principal.isAdminLike()) {
            throw ApiException.forbidden("You do not have permission for this action.");
        }
    }

    public static void requireSuperAdmin(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        if (principal.role() != Role.SUPER_ADMIN) {
            throw ApiException.forbidden("Only a SUPER_ADMIN can perform this action");
        }
    }
}
