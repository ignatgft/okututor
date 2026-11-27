package com.okututor.backend.media;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.okututor.backend.common.config.JacksonConfig;
import com.okututor.backend.security.JwtService;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.support.SupportTicketMessageRepository;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.io.ByteArrayInputStream;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(MediaFileController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonConfig.class)
class MediaFileControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean ObjectStorage storage;
    @MockitoBean MediaObjectRepository mediaObjectRepository;
    @MockitoBean SupportTicketMessageRepository supportTicketMessageRepository;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean com.okututor.backend.observability.ObservabilityMetrics observabilityMetrics;

    private UUID ownerId;
    private UUID recipientId;
    private UUID strangerId;
    private UUID adminId;
    private MediaObject sampleMedia;

    @BeforeEach
    void setUp() throws Exception {
        ownerId = UUID.randomUUID();
        recipientId = UUID.randomUUID();
        strangerId = UUID.randomUUID();
        adminId = UUID.randomUUID();

        User owner = new User();
        owner.setId(ownerId);
        owner.setRole(Role.USER);

        sampleMedia = new MediaObject();
        sampleMedia.setId(UUID.randomUUID());
        sampleMedia.setOwner(owner);

        when(storage.contentLength(anyString())).thenReturn(11L);
        when(storage.openStream(anyString())).thenReturn(new ByteArrayInputStream("test content".getBytes()));
    }

    private void authenticate(UUID userId, Role role) {
        UserPrincipal principal = new UserPrincipal(userId, "test@okututor.kg", role);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, java.util.List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void read_publicFile_anonymousOk_andHasPublicCacheControl() throws Exception {
        SecurityContextHolder.clearContext();
        mockMvc.perform(get("/api/v1/files/media/users/avatar/test.webp"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/webp"))
                .andExpect(header().string("Cache-Control", "public, max-age=31536000, immutable"));
    }

    @Test
    void read_publicFile_304NotModified_hasPublicCacheControl() throws Exception {
        SecurityContextHolder.clearContext();
        String etag = "W/\"" + Integer.toHexString("users/avatar/test.webp".hashCode()) + "\"";
        mockMvc.perform(get("/api/v1/files/media/users/avatar/test.webp")
                        .header("If-None-Match", etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string("Cache-Control", "public, max-age=31536000, immutable"));
    }

    @Test
    void read_privateFile_anonymousUnauthorized() throws Exception {
        SecurityContextHolder.clearContext();
        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void read_privateFile_ownerOk_andHasPrivateNoStoreCacheControl() throws Exception {
        authenticate(ownerId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_304NotModified_hasPrivateNoStoreCacheControl() throws Exception {
        authenticate(ownerId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));

        String etag = "W/\"" + Integer.toHexString("messages/attachments/test.pdf".hashCode()) + "\"";
        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf")
                        .header("If-None-Match", etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_recipientAuthorizedByTicket_ok() throws Exception {
        authenticate(recipientId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));
        when(supportTicketMessageRepository.isAuthorizedTicketParticipant(sampleMedia.getId(), recipientId))
                .thenReturn(true);

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_recipientAuthorizedByTicket_304NotModified_hasPrivateNoStore() throws Exception {
        authenticate(recipientId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));
        when(supportTicketMessageRepository.isAuthorizedTicketParticipant(sampleMedia.getId(), recipientId))
                .thenReturn(true);
        when(storage.openStream("messages/attachments/test.pdf"))
                .thenReturn(new ByteArrayInputStream("pdf-bytes".getBytes()));

        MvcResult first = mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"))
                .andReturn();

        String etag = first.getResponse().getHeader("ETag");
        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf")
                        .header("If-None-Match", etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_queryException_failsClosedWithForbidden() throws Exception {
        authenticate(strangerId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));
        when(supportTicketMessageRepository.isAuthorizedTicketParticipant(sampleMedia.getId(), strangerId))
                .thenThrow(new RuntimeException("db failure"));

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isForbidden());
    }

    @Test
    void read_privateFile_superAdminOk() throws Exception {
        authenticate(strangerId, Role.SUPER_ADMIN);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));
        when(storage.openStream("messages/attachments/test.pdf"))
                .thenReturn(new ByteArrayInputStream("pdf-bytes".getBytes()));

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_strangerForbidden() throws Exception {
        authenticate(strangerId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));
        when(supportTicketMessageRepository.isAuthorizedTicketParticipant(sampleMedia.getId(), strangerId))
                .thenReturn(false);

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isForbidden());
    }

    @Test
    void read_privateFile_adminOk() throws Exception {
        authenticate(adminId, Role.ADMIN);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/test.pdf"))
                .thenReturn(Optional.of(sampleMedia));

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/test.pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_missingMetadata_forbidden() throws Exception {
        authenticate(strangerId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/unknown.pdf"))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/unknown.pdf"))
                .andExpect(status().isForbidden());
    }

    @Test
    void read_privateFile_ownerNull_authorizedByTicket_ok() throws Exception {
        MediaObject unowned = new MediaObject();
        unowned.setId(UUID.randomUUID());
        unowned.setOwner(null);

        authenticate(recipientId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/unowned.pdf"))
                .thenReturn(Optional.of(unowned));
        when(supportTicketMessageRepository.isAuthorizedTicketParticipant(unowned.getId(), recipientId))
                .thenReturn(true);
        when(storage.openStream("messages/attachments/unowned.pdf"))
                .thenReturn(new ByteArrayInputStream("pdf-bytes".getBytes()));

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/unowned.pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void read_privateFile_ownerNull_strangerForbidden() throws Exception {
        MediaObject unowned = new MediaObject();
        unowned.setId(UUID.randomUUID());
        unowned.setOwner(null);

        authenticate(strangerId, Role.USER);
        when(mediaObjectRepository.findByObjectKey("messages/attachments/unowned.pdf"))
                .thenReturn(Optional.of(unowned));
        when(supportTicketMessageRepository.isAuthorizedTicketParticipant(unowned.getId(), strangerId))
                .thenReturn(false);

        mockMvc.perform(get("/api/v1/files/media/messages/attachments/unowned.pdf"))
                .andExpect(status().isForbidden());
    }

    @Test
    void read_pathTraversal_notFound() throws Exception {
        mockMvc.perform(get("/api/v1/files/media/..%2Fetc/passwd"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/files/media/tutors/../messages/secret.pdf"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/files/media/users/./avatar.webp"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/files/media/%252e%252e/secret.pdf"))
                .andExpect(status().isNotFound());
    }
}
