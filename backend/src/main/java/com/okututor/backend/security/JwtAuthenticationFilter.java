package com.okututor.backend.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Аутентификация по Bearer-токену. Загружает пользователя на каждый запрос, чтобы
 * смены ролей и блокировки применялись мгновенно.
 * Использует bounded Caffeine in-memory cache на 30 секунд для снижения нагрузки на БД.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final com.okututor.backend.observability.ObservabilityMetrics metrics;

    // small in-memory cache for 30s to avoid DB hit on every request (блокировка всё равно почти мгновенно)
    private final Cache<UUID, User> userCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofSeconds(30))
            .maximumSize(10_000)
            .build();

    public JwtAuthenticationFilter(JwtService jwtService,
                                   UserRepository userRepository,
                                   com.okututor.backend.observability.ObservabilityMetrics metrics) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.metrics = metrics;
    }

    public void invalidate(UUID userId) {
        if (userId != null) {
            userCache.invalidate(userId);
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtService.parse(header.substring(7));
                UUID userId = UUID.fromString(claims.getSubject());
                User user = userCache.get(userId, id -> userRepository.findById(id).orElse(null));
                if (user != null && !user.isBlocked()) {
                    UserPrincipal principal = new UserPrincipal(
                            user.getId(), user.getEmail(), user.getRole());
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (IllegalArgumentException | JwtException ex) {
                metrics.securityEvent("invalid_token");
                log.debug("Rejected bearer token: {}", ex.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
