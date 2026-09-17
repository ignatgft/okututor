package com.okututor.backend.common.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.okututor.backend.common.config.AppProperties;
import com.okututor.backend.common.error.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Заглушка легаси EDTECH: при app.legacy.enabled=false — 410 GONE,
 * при enabled=true — добавляет Deprecation/Sunset заголовки.
 * Marketplace (/tutors, /search/tutors, /tutor-requests, /conversations) не трогает.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class LegacyApiGuard extends OncePerRequestFilter {

    private static final List<String> LEGACY_PREFIXES = List.of(
            "/api/v1/courses",
            "/api/v1/enrollments",
            "/api/v1/applications",
            "/api/v1/bookings",
            "/api/v1/schedule",
            "/api/v1/lessons",
            "/api/v1/calendar",
            "/api/v1/availability",
            "/api/v1/tutors/applications",
            "/api/v1/tutors/availability",
            "/api/v1/messages",
            "/api/v1/search/courses",
            "/api/v1/users/tutors"
    );

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public LegacyApiGuard(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        boolean isLegacy = LEGACY_PREFIXES.stream().anyMatch(uri::startsWith);
        // also /api/v1/tutors/{id}/availability handled via prefix above, and livekit webhook excluded
        if (isLegacy && uri.contains("/livekit")) isLegacy = false;

        if (isLegacy) {
            if (!appProperties.getLegacy().isEnabled()) {
                response.setStatus(HttpStatus.GONE.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                ApiError body = ApiError.of(410, "GONE", "Legacy EDTECH API disabled. Use marketplace: /api/v1/tutors, /api/v1/search/tutors, /api/v1/tutor-requests, /api/v1/conversations. See docs/LEGACY.md");
                response.getWriter().write(objectMapper.writeValueAsString(body));
                response.addHeader("Deprecation", "true");
                response.addHeader("Sunset", "Thu, 31 Dec 2026 23:59:59 GMT");
                response.addHeader("Link", "</api/v1/tutors>; rel=\"successor-version\"");
                return;
            } else {
                // enabled — мягкая депрекация, не блокируем
                response.addHeader("Deprecation", "true");
                response.addHeader("Sunset", "Thu, 31 Dec 2026 23:59:59 GMT");
                response.addHeader("Link", "</api/v1/tutors>; rel=\"successor-version\"");
                // лог для observability
                if (logger.isDebugEnabled()) {
                    logger.debug("LEGACY API called: " + request.getMethod() + " " + uri);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
