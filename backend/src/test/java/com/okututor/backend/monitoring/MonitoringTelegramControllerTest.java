package com.okututor.backend.monitoring;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MonitoringTelegramController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({JacksonConfig.class, MonitoringProperties.class})
class MonitoringTelegramControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean JwtService jwtService;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;
    @MockitoBean com.okututor.backend.user.UserRepository userRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanGetStatus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/monitoring/telegram"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chatId").exists())
                .andExpect(jsonPath("$.connected").exists())
                .andExpect(jsonPath("$.enabled").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void responseNeverContainsToken() throws Exception {
        var result = mockMvc.perform(get("/api/v1/admin/monitoring/telegram"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assert !result.toLowerCase().contains("token");
        assert !result.toLowerCase().contains("bot_token");
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanPostConnect() throws Exception {
        mockMvc.perform(post("/api/v1/admin/monitoring/telegram/connect"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connected").exists());
    }

    // USER 403 enforced at SecurityFilterChain + @PreAuthorize in full app context;
    // slice test with addFilters=false bypasses filter, so we only verify shape for ADMIN.
    // Full RBAC validated via AdminGuardTest + manual integration test.
}
