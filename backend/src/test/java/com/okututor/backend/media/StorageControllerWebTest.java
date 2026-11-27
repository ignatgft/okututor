package com.okututor.backend.media;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.common.ratelimit.RateLimitService;
import com.okututor.backend.security.JwtService;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.UserRepository;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StorageController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonConfig.class)
class StorageControllerWebTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean ObjectStorage storage;
    @MockitoBean RateLimitService rateLimitService;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;

    @BeforeEach
    void authenticate() {
        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@test.kg", Role.USER);
        var auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void uploadUrl_messageAttachmentForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/storage/upload-url")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"MESSAGE_ATTACHMENT","content_type":"application/pdf","size":1024,"extension":"pdf"}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(storage);
    }

    @Test
    void uploadUrl_messageThumbnailForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/storage/upload-url")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"MESSAGE_THUMBNAIL","content_type":"image/webp","size":512,"extension":"webp"}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(storage);
    }

    @Test
    void uploadUrl_avatarDelegatesToStoragePresigner() throws Exception {
        when(storage.createPresignedUploadUrl(anyString(), anyString(), any(Duration.class)))
                .thenReturn("https://r2.example.com/presigned-put");
        when(storage.publicUrl(anyString()))
                .thenReturn("https://cdn.okututor.kg/users/avatar.webp");

        mockMvc.perform(post("/api/v1/storage/upload-url")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"AVATAR","content_type":"image/webp","size":2048,"extension":"webp"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upload_url").value("https://r2.example.com/presigned-put"))
                .andExpect(jsonPath("$.public_url").value("https://cdn.okututor.kg/users/avatar.webp"));

        verify(storage).createPresignedUploadUrl(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void publicUrl_privateKeyPrefixesForbidden() throws Exception {
        for (String key : new String[]{
                "messages/attachments/doc.pdf",
                "/messages/attachment-thumb/img.webp",
                "support/42/doc.pdf",
                "chat/99/img.png",
                "/private/key.bin",
                "Messages/attachments/case.pdf",
                "messages"
        }) {
            mockMvc.perform(get("/api/v1/storage/public-url").param("key", key))
                    .andExpect(status().isForbidden());
        }

        verifyNoInteractions(storage);
    }

    @Test
    void publicUrl_suspiciousKeysRejected() throws Exception {
        for (String key : new String[]{
                "tutors/../messages/secret.pdf",
                "messages\\attachments\\secret.pdf",
                "%2e%2e",
                "%252e%252e",
                "tutors/%252e%252e/messages/secret.pdf",
                "messages//attachments/secret.pdf",
                "//messages/attachments/secret.pdf",
                "///tutors/u1/photo.webp",
                "./messages/secret.pdf",
                "users/./avatar.webp",
                "messages/"
        }) {
            mockMvc.perform(get("/api/v1/storage/public-url").param("key", key))
                    .andExpect(status().isUnprocessableEntity());
        }

        verifyNoInteractions(storage);
    }

    @Test
    void publicUrl_publicKeyAllowedAndSingleLeadingSlashNormalized() throws Exception {
        when(storage.publicUrl("tutors/u1/photo.webp"))
                .thenReturn("https://cdn.okututor.kg/tutors/u1/photo.webp");

        mockMvc.perform(get("/api/v1/storage/public-url").param("key", "/tutors/u1/photo.webp"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicUrl").value("https://cdn.okututor.kg/tutors/u1/photo.webp"))
                .andExpect(jsonPath("$.objectKey").value("tutors/u1/photo.webp"));
    }
}
