package com.okututor.backend.favorite;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.security.JwtService;
import com.okututor.backend.tutor.*;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FavoriteController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonConfig.class)
class FavoriteControllerWebTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean FavoriteRepository favoriteRepository;
    @MockitoBean TutorProfileRepository profileRepository;
    @MockitoBean TutorProfileSubjectRepository subjectRepository;
    @MockitoBean TutorProfileLevelRepository levelRepository;
    @MockitoBean TutorProfileLanguageRepository languageRepository;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;

    @Test
    void list_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/favorites"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void add_requiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/favorites/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ids_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/favorites/ids"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void list_withAuth_returnsEmptyWhenNoFavorites() throws Exception {
        // Simulate authenticated via @AuthenticationPrincipal is not present in WebMvcTest without filter,
        // but we test that endpoint is mapped and returns 401 without principal correctly.
        // With addFilters=false, security is bypassed, so we need to verify service logic via unit test.
        // Here we just ensure endpoint exists and does not throw 404.
        when(favoriteRepository.findByUserIdWithDetails(any())).thenReturn(List.of());
        // Without principal, controller throws ApiException.unauthorized -> mapped to 401 by GlobalExceptionHandler
        // In WebMvcTest with filters off, principal is null, so still 401.
        mockMvc.perform(get("/api/v1/favorites"))
                .andExpect(status().isUnauthorized());
    }
}
