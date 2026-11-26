package com.okututor.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.okututor.backend.observability.ObservabilityMetrics;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

class JwtAuthenticationFilterTest {

    private JwtService jwtService;
    private UserRepository userRepository;
    private ObservabilityMetrics metrics;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        userRepository = mock(UserRepository.class);
        metrics = mock(ObservabilityMetrics.class);
        filter = new JwtAuthenticationFilter(jwtService, userRepository, metrics);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void cachesUserInCaffeineAndAvoidsSecondDbQuery() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("user@test.com");
        user.setRole(Role.USER);
        user.setBlocked(false);

        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(jwtService.parse("token123")).thenReturn(claims);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn("Bearer token123");
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        // First request - hits DB
        filter.doFilterInternal(request, response, chain);
        verify(userRepository, times(1)).findById(userId);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();

        // Second request - hits Caffeine cache, NOT DB
        SecurityContextHolder.clearContext();
        filter.doFilterInternal(request, response, chain);
        verify(userRepository, times(1)).findById(userId);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();

        // After invalidation - hits DB again
        filter.invalidate(userId);
        SecurityContextHolder.clearContext();
        filter.doFilterInternal(request, response, chain);
        verify(userRepository, times(2)).findById(userId);
    }

    @Test
    void blockedUserDoesNotAuthenticate() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("blocked@test.com");
        user.setRole(Role.USER);
        user.setBlocked(true);

        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(jwtService.parse("blockedToken")).thenReturn(claims);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn("Bearer blockedToken");
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }
}
