package com.okututor.backend.legal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TgAlertWebhookController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonConfig.class)
@TestPropertySource(properties = {
        "app.telegram.alert-secret=test-secret-12345"
})
class TgAlertWebhookControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TgHealthBotService botService;
    @MockitoBean JwtService jwtService;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;
    @MockitoBean com.okututor.backend.user.UserRepository userRepository;

    @Test
    void alert_rejectsMissingSecret() throws Exception {
        mockMvc.perform(post("/api/v1/telegram/alert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"firing\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void alert_rejectsInvalidSecret() throws Exception {
        mockMvc.perform(post("/api/v1/telegram/alert")
                        .header("X-Alert-Secret", "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"firing\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void alert_acceptsValidHeaderSecret() throws Exception {
        mockMvc.perform(post("/api/v1/telegram/alert")
                        .header("X-Alert-Secret", "test-secret-12345")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"firing\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void alert_acceptsValidBearerToken() throws Exception {
        mockMvc.perform(post("/api/v1/telegram/alert")
                        .header("Authorization", "Bearer test-secret-12345")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"firing\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void alert_rejectsQuerySecret() throws Exception {
        mockMvc.perform(post("/api/v1/telegram/alert")
                        .param("secret", "test-secret-12345")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"firing\"}"))
                .andExpect(status().isUnauthorized());
    }
}
