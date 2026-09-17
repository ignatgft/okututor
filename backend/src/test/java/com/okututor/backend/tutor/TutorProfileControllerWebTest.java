package com.okututor.backend.tutor;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.favorite.FavoriteRepository;
import com.okututor.backend.search.TutorSearchService;
import com.okututor.backend.security.JwtService;
import com.okututor.backend.tutor.dto.TutorProfileResponse;
import com.okututor.backend.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TutorProfileController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonConfig.class)
class TutorProfileControllerWebTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TutorProfileService service;
    @MockitoBean TutorProfileRepository repository;
    @MockitoBean TutorSearchService tutorSearchService;
    @MockitoBean com.okututor.backend.common.ratelimit.RateLimitService rateLimitService;
    @MockitoBean FavoriteRepository favoriteRepository;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;
    @MockitoBean com.okututor.backend.media.MediaService mediaService;
    @MockitoBean com.okututor.backend.user.UserService userService;
    @MockitoBean com.okututor.backend.media.MediaObjectRepository mediaObjectRepository;

    private TutorProfileResponse sample() {
        return new TutorProfileResponse(
                UUID.randomUUID(), UUID.randomUUID(), "tutor-12345678",
                "Test", "User", "Math tutor", "short", "about",
                "STUDENT_TUTOR", "edu", "uni", "details", 5,
                BigDecimal.valueOf(800), BigDecimal.valueOf(1500), "KGS",
                true, false, null, null, null, "PUBLISHED", "Опубликовано", null,
                10, Instant.now(), Instant.now(), Instant.now(), Instant.now().plusSeconds(86400*30),
                null, null, null, false,
                List.of(), List.of(), List.of(), "seo", "desc", "kw", false,
                BigDecimal.valueOf(4.9), 5, List.of(), List.of(), null, "Test User", true
        );
    }

    @Test
    void listing_public_ok() throws Exception {
        when(service.publicListing(anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sample()), PageRequest.of(0,20),1));
        mockMvc.perform(get("/api/v1/tutors").param("page","0").param("size","20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].first_name").value("Test"));
    }

    @Test
    void bySlug_notFound_returns404() throws Exception {
        when(service.getBySlugPublic("unknown")).thenThrow(com.okututor.backend.common.error.ApiException.notFound("not found"));
        mockMvc.perform(get("/api/v1/tutors/unknown"))
                .andExpect(status().isNotFound());
    }

    @Test
    void me_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/tutors/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_requiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/tutors")
                        .contentType("application/json")
                        .content("{\"first_name\":\"Test\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void hide_requiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/tutors/me/hide"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void delete_requiresAuth() throws Exception {
        mockMvc.perform(delete("/api/v1/tutors/me"))
                .andExpect(status().isUnauthorized());
    }
}
