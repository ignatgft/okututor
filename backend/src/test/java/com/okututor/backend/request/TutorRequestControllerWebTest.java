package com.okututor.backend.request;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.common.ratelimit.RateLimitService;
import com.okututor.backend.common.web.ClientIpResolver;
import com.okututor.backend.request.dto.TutorRequestResponse;
import com.okututor.backend.security.JwtService;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TutorRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonConfig.class)
class TutorRequestControllerWebTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TutorRequestService service;
    @MockitoBean RateLimitService rateLimitService;
    @MockitoBean ClientIpResolver clientIpResolver;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;

    private UUID userId;

    private TutorRequestResponse sample(String studentName) {
        return new TutorRequestResponse(
                UUID.randomUUID(), UUID.randomUUID(), "tutor-slug",
                UUID.randomUUID(), UUID.randomUUID(), studentName,
                "+996555123456", "Hello", "NEW",
                Instant.now(), Instant.now()
        );
    }

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(userId, "user@test.kg", Role.USER);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void list_directionIncoming_callsForTutor() throws Exception {
        when(service.forTutor(eq(userId), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(sample("Incoming Student")), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/tutor-requests").param("direction", "incoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].student_name").value("Incoming Student"));

        verify(service).forTutor(eq(userId), anyInt(), anyInt());
    }

    @Test
    void list_directionOutgoing_callsForStudent() throws Exception {
        when(service.forStudent(eq(userId), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(sample("Outgoing Inquiry")), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/tutor-requests").param("direction", "outgoing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].student_name").value("Outgoing Inquiry"));

        verify(service).forStudent(eq(userId), anyInt(), anyInt());
    }

    @Test
    void list_defaultPrioritizesIncomingIfPresent() throws Exception {
        when(service.forTutor(eq(userId), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(sample("Tutor Lead")), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/tutor-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].student_name").value("Tutor Lead"));
    }

    @Test
    void list_defaultFallsBackToOutgoingIfNoIncoming() throws Exception {
        when(service.forTutor(eq(userId), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(service.forStudent(eq(userId), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(sample("Student Search Request")), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/tutor-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].student_name").value("Student Search Request"));
    }
}
