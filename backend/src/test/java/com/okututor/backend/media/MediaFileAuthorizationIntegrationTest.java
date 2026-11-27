package com.okututor.backend.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.okututor.backend.common.config.AppProperties;
import com.okututor.backend.security.JwtService;
import com.okututor.backend.support.SupportTicket;
import com.okututor.backend.support.SupportTicketAdminService;
import com.okututor.backend.support.SupportTicketMessage;
import com.okututor.backend.support.SupportTicketMessageRepository;
import com.okututor.backend.support.SupportTicketRepository;
import com.okututor.backend.support.SupportTicketUserService;
import com.okututor.backend.support.dto.SupportTicketCreateRequest;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileMedia;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.user.Role;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class MediaFileAuthorizationIntegrationTest {

    static {
        // Docker Desktop >= 29 drops client API < 1.40; align Testcontainers if not configured externally.
        if (System.getProperty("api.version") == null && System.getenv("DOCKER_API_VERSION") == null) {
            System.setProperty("api.version", "1.44");
        }
    }

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withReuse(false);

    @TempDir
    static Path tempStorageDir;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("app.media.provider", () -> "local");
        registry.add("app.storage.local-dir", () -> tempStorageDir.toAbsolutePath().toString());
    }

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired SupportTicketUserService supportTicketUserService;
    @Autowired SupportTicketAdminService supportTicketAdminService;
    @Autowired SupportTicketRepository supportTicketRepository;
    @Autowired SupportTicketMessageRepository supportTicketMessageRepository;
    @Autowired MessageAttachmentRepository messageAttachmentRepository;
    @Autowired MediaService mediaService;
    @Autowired MediaObjectRepository mediaObjectRepository;
    @Autowired TutorProfileRepository tutorProfileRepository;
    @Autowired ObjectStorage objectStorage;
    @Autowired AppProperties appProperties;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TransactionTemplate transactionTemplate;
    @Autowired EntityManager entityManager;

    @Test
    void unassignedTicket_pdfWithoutThumbnail_authorAuthorizedWhileStrangerForbidden_and304PreservesNoStore()
            throws Exception {
        User author = saveUser("pdf-author", Role.USER);
        User responderAdmin = saveUser("pdf-responder", Role.ADMIN);
        User platformAdmin = saveUser("pdf-platform-admin", Role.ADMIN);
        User superAdmin = saveUser("pdf-super-admin", Role.SUPER_ADMIN);
        User stranger = saveUser("pdf-stranger", Role.USER);

        var created = supportTicketUserService.create(
                author,
                new SupportTicketCreateRequest("TECHNICAL", "PDF upload check", "Need help", "NORMAL"));
        Long ticketNumber = Long.parseLong(created.id().replace("TK-", ""));

        byte[] pdfBytes = samplePdfBytes("Unassigned Ticket PDF");
        MockMultipartFile pdfPart = new MockMultipartFile(
                "file", "contract.pdf", "application/pdf", pdfBytes);

        // Store PDF attachment owned by responderAdmin without assigning ticket.assignedAdmin,
        // proving both assignedAdmin IS NULL and thumbnail IS NULL work with LEFT JOIN JPQL.
        MessageAttachment pdfAttachment = mediaService.storeClaimedMessageAttachment(responderAdmin, pdfPart);
        SupportTicket ticket = supportTicketRepository.findByNumber(ticketNumber).orElseThrow();
        SupportTicketMessage message = new SupportTicketMessage();
        message.setTicket(ticket);
        message.setSender(responderAdmin);
        message.setSenderRole("ADMIN");
        message.setBody("Here is the PDF");
        message.setType(SupportTicketMessage.Type.USER_VISIBLE);
        message.setAttachment(pdfAttachment);
        supportTicketMessageRepository.saveAndFlush(message);

        UUID assignedAdminDb = jdbcTemplate.queryForObject(
                "SELECT assigned_admin_id FROM support_tickets WHERE number = ?",
                UUID.class, ticketNumber);
        assertThat(assignedAdminDb).isNull();
        assertThat(pdfAttachment.getThumbnail()).isNull();

        UUID mediaId = pdfAttachment.getMedia().getId();
        String pdfUrl = pdfAttachment.getMedia().getPublicUrl();
        assertThat(pdfUrl).startsWith("/api/v1/files/media/messages/");

        // Real PostgreSQL LEFT JOIN check: assignedAdmin IS NULL and thumbnail IS NULL must NOT drop the row.
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(mediaId, author.getId())).isTrue();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(mediaId, stranger.getId())).isFalse();

        // Anonymous request goes through active Spring Security filter chain -> 401.
        mockMvc.perform(get(pdfUrl))
                .andExpect(status().isUnauthorized());

        // Stranger authenticated -> 403 Forbidden.
        mockMvc.perform(get(pdfUrl).header("Authorization", bearer(stranger)))
                .andExpect(status().isForbidden());

        // Author (not media.owner, ticket.assignedAdmin is null, attachment.thumbnail is null) -> 200 + strict no-store.
        MvcResult firstResponse = mockMvc.perform(get(pdfUrl).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"))
                .andExpect(content().bytes(pdfBytes))
                .andReturn();

        String etag = firstResponse.getResponse().getHeader("ETag");
        assertThat(etag).isNotBlank();

        // 304 Not Modified must still preserve Cache-Control & Pragma.
        mockMvc.perform(get(pdfUrl)
                        .header("Authorization", bearer(author))
                        .header("If-None-Match", etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));

        // Stranger with ETag must still receive 403 (no 304 side-channel).
        mockMvc.perform(get(pdfUrl)
                        .header("Authorization", bearer(stranger))
                        .header("If-None-Match", etag))
                .andExpect(status().isForbidden());

        // Owner, ADMIN, and SUPER_ADMIN also succeed with private cache headers.
        for (User privileged : new User[]{responderAdmin, platformAdmin, superAdmin}) {
            mockMvc.perform(get(pdfUrl).header("Authorization", bearer(privileged)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                    .andExpect(header().string("Pragma", "no-cache"));
        }
    }

    @Test
    void assignedAdmin_andImageWithThumbnail_authorizesBothMediaAndThumbnailAcrossSecurityAndJpql()
            throws Exception {
        User author = saveUser("img-author", Role.USER);
        User assignedAdmin = saveUser("img-assigned-admin", Role.ADMIN);
        User otherAdmin = saveUser("img-other-admin", Role.ADMIN);
        User stranger = saveUser("img-stranger", Role.USER);

        var created = supportTicketUserService.create(
                author,
                new SupportTicketCreateRequest("BUG", "Screenshot issue", "Button broken", "NORMAL"));
        Long ticketNumber = Long.parseLong(created.id().replace("TK-", ""));
        supportTicketAdminService.assign(ticketNumber, assignedAdmin, assignedAdmin.getId());

        MockMultipartFile pngFile = samplePngFile("bug-screenshot.png");

        // Real multipart upload through Spring Security + SupportController.
        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/support/tickets/" + created.id() + "/messages")
                        .file(pngFile)
                        .param("body", "Screenshot attached")
                        .header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode msgJson = objectMapper.readTree(uploadResult.getResponse().getContentAsString());
        UUID mediaId = UUID.fromString(msgJson.at("/attachments/0/media_id").asText());
        String mediaUrl = msgJson.at("/attachments/0/url").asText();
        String thumbUrl = msgJson.at("/attachments/0/thumbnail_url").asText();
        assertThat(mediaUrl).startsWith("/api/v1/files/media/messages/");
        assertThat(thumbUrl).startsWith("/api/v1/files/media/messages/");

        String thumbKey = thumbUrl.replaceFirst("^/api/v1/files/media/", "");
        UUID thumbMediaId = mediaObjectRepository.findByObjectKey(thumbKey).orElseThrow().getId();

        // Direct JPQL verification on PostgreSQL: assignedAdmin is authorized for BOTH media & thumbnail,
        // while an unassigned admin is NOT returned by the ticket participant query.
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(mediaId, assignedAdmin.getId())).isTrue();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(thumbMediaId, assignedAdmin.getId())).isTrue();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(mediaId, otherAdmin.getId())).isFalse();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(thumbMediaId, stranger.getId())).isFalse();

        // HTTP verification for both media and thumbnail.
        for (String protectedUrl : new String[]{mediaUrl, thumbUrl}) {
            mockMvc.perform(get(protectedUrl))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(get(protectedUrl).header("Authorization", bearer(stranger)))
                    .andExpect(status().isForbidden());

            MvcResult ok = mockMvc.perform(get(protectedUrl).header("Authorization", bearer(assignedAdmin)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                    .andExpect(header().string("Pragma", "no-cache"))
                    .andReturn();

            String etag = ok.getResponse().getHeader("ETag");
            mockMvc.perform(get(protectedUrl)
                            .header("Authorization", bearer(author))
                            .header("If-None-Match", etag))
                    .andExpect(status().isNotModified())
                    .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                    .andExpect(header().string("Pragma", "no-cache"));
        }
    }

    @Test
    void internalNoteAttachment_isHiddenFromTicketAuthorButAccessibleToAssignedAdmin() throws Exception {
        User author = saveUser("internal-author", Role.USER);
        User assignedAdmin = saveUser("internal-admin", Role.ADMIN);

        var created = supportTicketUserService.create(
                author,
                new SupportTicketCreateRequest("ACCOUNT", "Verification question", "Check ID", "HIGH"));
        Long ticketNumber = Long.parseLong(created.id().replace("TK-", ""));
        supportTicketAdminService.assign(ticketNumber, assignedAdmin, assignedAdmin.getId());

        MessageAttachment internalAtt = mediaService.storeClaimedMessageAttachment(
                assignedAdmin, new MockMultipartFile("file", "audit.pdf", "application/pdf", samplePdfBytes("Internal")));

        SupportTicket ticket = supportTicketRepository.findByNumber(ticketNumber).orElseThrow();
        SupportTicketMessage note = new SupportTicketMessage();
        note.setTicket(ticket);
        note.setSender(assignedAdmin);
        note.setSenderRole("ADMIN");
        note.setBody("Internal fraud check document");
        note.setType(SupportTicketMessage.Type.INTERNAL_NOTE);
        note.setAttachment(internalAtt);
        supportTicketMessageRepository.saveAndFlush(note);

        UUID internalMediaId = internalAtt.getMedia().getId();
        String internalUrl = internalAtt.getMedia().getPublicUrl();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(internalMediaId, author.getId())).isFalse();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(internalMediaId, assignedAdmin.getId())).isTrue();

        mockMvc.perform(get(internalUrl).header("Authorization", bearer(author)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(internalUrl).header("Authorization", bearer(assignedAdmin)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));
    }

    @Test
    void storageController_blocksPrivatePresignedUploadsAndPrivatePublicUrlLookup() throws Exception {
        User user = saveUser("storage-user", Role.USER);

        mockMvc.perform(post("/api/v1/storage/upload-url")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"MESSAGE_ATTACHMENT","content_type":"application/pdf","size":1024,"extension":"pdf"}
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/storage/upload-url")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"MESSAGE_ATTACHMENT","content_type":"application/pdf","size":1024,"extension":"pdf"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/storage/upload-url")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"MESSAGE_THUMBNAIL","content_type":"image/webp","size":512,"extension":"webp"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/storage/public-url").param("key", "messages/attachments/secret.pdf"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/storage/public-url")
                        .header("Authorization", bearer(user))
                        .param("key", "messages/attachments/secret.pdf"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/storage/public-url")
                        .header("Authorization", bearer(user))
                        .param("key", "/support/77/doc.pdf"))
                .andExpect(status().isForbidden());

        for (String suspiciousKey : new String[]{
                "tutors/../messages/secret.pdf",
                "messages\\attachments\\secret.pdf",
                "%2e%2e",
                "%252e%252e",
                "messages//attachments/secret.pdf",
                "//messages/secret.pdf",
                "users/./avatar.webp"
        }) {
            mockMvc.perform(get("/api/v1/storage/public-url")
                            .header("Authorization", bearer(user))
                            .param("key", suspiciousKey))
                    .andExpect(status().isUnprocessableEntity());
        }

        mockMvc.perform(get("/api/v1/storage/public-url")
                        .header("Authorization", bearer(user))
                        .param("key", "/tutors/u-1/profile.webp"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.objectKey").value("tutors/u-1/profile.webp"))
                .andExpect(jsonPath("$.publicUrl").value("/api/v1/files/media/tutors/u-1/profile.webp"));
    }

    @Test
    void unownedMediaObject_ticketAuthorAndAssignedAdminAuthorized_whileStrangerAndMissingMediaForbidden()
            throws Exception {
        User author = saveUser("owner-null-author", Role.USER);
        User assignedAdmin = saveUser("owner-null-admin", Role.ADMIN);
        User stranger = saveUser("owner-null-stranger", Role.USER);

        var created = supportTicketUserService.create(
                author,
                new SupportTicketCreateRequest("TECHNICAL", "Detached owner attachment", "Check access", "NORMAL"));
        Long ticketNumber = Long.parseLong(created.id().replace("TK-", ""));
        supportTicketAdminService.assign(ticketNumber, assignedAdmin, assignedAdmin.getId());
        SupportTicket ticket = supportTicketRepository.findByNumber(ticketNumber).orElseThrow();

        // Visible ticket attachment whose MediaObject.owner becomes NULL.
        byte[] visiblePdfBytes = samplePdfBytes("Unowned Visible Ticket PDF");
        MessageAttachment visibleAtt = mediaService.storeClaimedMessageAttachment(
                assignedAdmin, new MockMultipartFile("file", "unowned-visible.pdf", "application/pdf", visiblePdfBytes));
        MediaObject visibleMedia = visibleAtt.getMedia();
        visibleMedia.setOwner(null);
        visibleMedia = mediaObjectRepository.saveAndFlush(visibleMedia);

        SupportTicketMessage visibleMsg = new SupportTicketMessage();
        visibleMsg.setTicket(ticket);
        visibleMsg.setSender(assignedAdmin);
        visibleMsg.setSenderRole("ADMIN");
        visibleMsg.setBody("Visible attachment with detached owner");
        visibleMsg.setType(SupportTicketMessage.Type.USER_VISIBLE);
        visibleMsg.setAttachment(visibleAtt);
        supportTicketMessageRepository.saveAndFlush(visibleMsg);

        // Internal note attachment whose MediaObject.owner also becomes NULL.
        MessageAttachment internalAtt = mediaService.storeClaimedMessageAttachment(
                assignedAdmin, new MockMultipartFile("file", "unowned-internal.pdf", "application/pdf", samplePdfBytes("Unowned Internal")));
        MediaObject internalMedia = internalAtt.getMedia();
        internalMedia.setOwner(null);
        internalMedia = mediaObjectRepository.saveAndFlush(internalMedia);

        SupportTicketMessage internalMsg = new SupportTicketMessage();
        internalMsg.setTicket(ticket);
        internalMsg.setSender(assignedAdmin);
        internalMsg.setSenderRole("ADMIN");
        internalMsg.setBody("Internal attachment with detached owner");
        internalMsg.setType(SupportTicketMessage.Type.INTERNAL_NOTE);
        internalMsg.setAttachment(internalAtt);
        supportTicketMessageRepository.saveAndFlush(internalMsg);

        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(visibleMedia.getId(), author.getId())).isTrue();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(visibleMedia.getId(), assignedAdmin.getId())).isTrue();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(visibleMedia.getId(), stranger.getId())).isFalse();
        assertThat(supportTicketMessageRepository.isAuthorizedTicketParticipant(internalMedia.getId(), author.getId())).isFalse();

        // owner = NULL + ticket author -> 200 & 304 preserve private no-store headers.
        MvcResult authorOk = mockMvc.perform(get(visibleMedia.getPublicUrl()).header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"))
                .andExpect(content().bytes(visiblePdfBytes))
                .andReturn();

        mockMvc.perform(get(visibleMedia.getPublicUrl())
                        .header("Authorization", bearer(author))
                        .header("If-None-Match", authorOk.getResponse().getHeader("ETag")))
                .andExpect(status().isNotModified())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));

        // owner = NULL + assigned admin -> 200.
        mockMvc.perform(get(visibleMedia.getPublicUrl()).header("Authorization", bearer(assignedAdmin)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, must-revalidate"))
                .andExpect(header().string("Pragma", "no-cache"));

        // owner = NULL + stranger -> 403.
        mockMvc.perform(get(visibleMedia.getPublicUrl()).header("Authorization", bearer(stranger)))
                .andExpect(status().isForbidden());

        // owner = NULL + internal note + author -> 403 (never fail-open).
        mockMvc.perform(get(internalMedia.getPublicUrl()).header("Authorization", bearer(author)))
                .andExpect(status().isForbidden());

        // Missing MediaObject -> 403.
        mockMvc.perform(get("/api/v1/files/media/messages/attachments/missing-" + UUID.randomUUID() + ".pdf")
                        .header("Authorization", bearer(author)))
                .andExpect(status().isForbidden());
    }

    @Test
    void orphanMediaCleaner_preservesAttachmentsThumbnailsProfileMediaAndCurrentAvatarOnRealPostgres()
            throws Exception {
        User user = saveUser("orphan-owner", Role.USER);

        // 1) Owned ticket attachment (PNG produces both MESSAGE_ATTACHMENT + MESSAGE_THUMBNAIL).
        MessageAttachment ownedImgAtt = mediaService.storeClaimedMessageAttachment(
                user, samplePngFile("owned-ticket.png"));
        MediaObject ownedAttachmentMedia = ownedImgAtt.getMedia();
        MediaObject ownedAttachmentThumb = ownedImgAtt.getThumbnail();

        // 2) Unowned ticket attachment (owner = NULL simulating deleted user, still referenced by message_attachments).
        MessageAttachment unownedImgAtt = mediaService.storeClaimedMessageAttachment(
                user, samplePngFile("unowned-ticket.png"));
        MediaObject unownedAttachmentMedia = unownedImgAtt.getMedia();
        unownedAttachmentMedia.setOwner(null);
        unownedAttachmentMedia = mediaObjectRepository.saveAndFlush(unownedAttachmentMedia);
        MediaObject unownedAttachmentThumb = unownedImgAtt.getThumbnail();
        unownedAttachmentThumb.setOwner(null);
        unownedAttachmentThumb = mediaObjectRepository.saveAndFlush(unownedAttachmentThumb);

        // 3) Owned & unowned tutor profile photos referenced by tutor_profile_media.
        TutorProfile profile = new TutorProfile();
        profile.setUser(user);
        profile.setSlug("tutor-orphan-check-" + UUID.randomUUID());
        profile.setFirstName("Aida");
        TutorProfile savedProfile = tutorProfileRepository.saveAndFlush(profile);

        byte[] dummyWebp = "RIFF0000WEBP".getBytes(StandardCharsets.UTF_8);
        ObjectStorage.StoredObject storedProfileObj = objectStorage.upload(
                "tutors/" + savedProfile.getId() + "/owned-profile.webp", dummyWebp, "image/webp");
        MediaObject ownedProfileMedia = saveMediaObject(
                user, MediaKind.PROFILE, storedProfileObj, "image/webp", dummyWebp.length);

        ObjectStorage.StoredObject storedUnownedProfileObj = objectStorage.upload(
                "tutors/" + savedProfile.getId() + "/gallery-profile.webp", dummyWebp, "image/webp");
        MediaObject unownedProfileMedia = saveMediaObject(
                null, MediaKind.PROFILE, storedUnownedProfileObj, "image/webp", dummyWebp.length);

        transactionTemplate.executeWithoutResult(status -> {
            entityManager.persist(new TutorProfileMedia(savedProfile, ownedProfileMedia, 0, true));
            entityManager.persist(new TutorProfileMedia(savedProfile, unownedProfileMedia, 1, false));
            entityManager.flush();
        });

        // 4) Current active avatar vs leaked old avatar left in media_objects (e.g. failed cleanup during replacement).
        String currentAvatarUrl = mediaService.updateAvatar(user, samplePngFile("current-avatar.png"));
        user = userRepository.saveAndFlush(user);
        MediaObject currentAvatarMedia = mediaObjectRepository
                .findByObjectKey(currentAvatarUrl.replaceFirst("^/api/v1/files/media/", "")).orElseThrow();

        ObjectStorage.StoredObject leakedOldAvatarObj = objectStorage.upload(
                "users/" + user.getId() + "/leaked-old-avatar.webp", dummyWebp, "image/webp");
        MediaObject oldAvatarMedia = saveMediaObject(
                user, MediaKind.AVATAR, leakedOldAvatarObj, "image/webp", dummyWebp.length);

        // 5) Truly unreferenced unowned orphan.
        ObjectStorage.StoredObject unrefObj = objectStorage.upload(
                "users/orphans/stale.webp", dummyWebp, "image/webp");
        MediaObject unreferencedOrphan = saveMediaObject(
                null, MediaKind.AVATAR, unrefObj, "image/webp", dummyWebp.length);

        // Age every created_at past orphanGrace in UTC (media_objects.created_at is timestamp without time zone, Hibernate uses UTC).
        Instant expiredAt = Instant.now().minus(appProperties.getMedia().getOrphanGrace()).minusSeconds(7200);
        Timestamp expiredUtcTimestamp = Timestamp.valueOf(LocalDateTime.ofInstant(expiredAt, ZoneOffset.UTC));
        for (MediaObject m : new MediaObject[]{
                ownedAttachmentMedia, ownedAttachmentThumb,
                unownedAttachmentMedia, unownedAttachmentThumb,
                ownedProfileMedia, unownedProfileMedia,
                oldAvatarMedia, currentAvatarMedia, unreferencedOrphan
        }) {
            jdbcTemplate.update("UPDATE media_objects SET created_at = ? WHERE id = ?",
                    expiredUtcTimestamp, m.getId());
        }

        OrphanMediaCleaner cleaner = new OrphanMediaCleaner(mediaObjectRepository, objectStorage, appProperties);
        cleaner.cleanup();

        // Preserved in DB and on disk:
        for (MediaObject preserved : new MediaObject[]{
                ownedAttachmentMedia, ownedAttachmentThumb,
                unownedAttachmentMedia, unownedAttachmentThumb,
                ownedProfileMedia, unownedProfileMedia,
                currentAvatarMedia
        }) {
            assertThat(mediaObjectRepository.findById(preserved.getId()))
                    .as("Expected MediaObject %s (%s) to be preserved in DB", preserved.getObjectKey(), preserved.getKind())
                    .isPresent();
            assertThat(objectStorage.exists(preserved.getObjectKey()))
                    .as("Expected storage file %s to remain on disk", preserved.getObjectKey())
                    .isTrue();
            assertThat(Files.exists(tempStorageDir.resolve("media").resolve(preserved.getObjectKey()))).isTrue();
        }

        // Deleted from DB and disk:
        for (MediaObject deleted : new MediaObject[]{oldAvatarMedia, unreferencedOrphan}) {
            assertThat(mediaObjectRepository.findById(deleted.getId()))
                    .as("Expected MediaObject %s to be deleted from DB", deleted.getObjectKey())
                    .isEmpty();
            assertThat(objectStorage.exists(deleted.getObjectKey()))
                    .as("Expected storage file %s to be deleted from disk", deleted.getObjectKey())
                    .isFalse();
        }
    }

    @Test
    void orphanMediaCleaner_preservesPostgresRowWhenStorageFails_andDeletesIdempotentlyWhenFileAbsent()
            throws Exception {
        byte[] dummyWebp = "RIFF0000WEBP".getBytes(StandardCharsets.UTF_8);
        String missingKey = "users/orphans/already-gone-" + UUID.randomUUID() + ".webp";
        ObjectStorage.StoredObject missingObj = objectStorage.upload(missingKey, dummyWebp, "image/webp");
        MediaObject missingOrphan = saveMediaObject(null, MediaKind.AVATAR, missingObj, "image/webp", dummyWebp.length);
        // Simulate file already missing in storage (idempotent delete expected).
        Files.deleteIfExists(tempStorageDir.resolve("media").resolve(missingKey));

        String failingKey = "users/orphans/storage-error-" + UUID.randomUUID() + ".webp";
        ObjectStorage.StoredObject failingObj = objectStorage.upload(failingKey, dummyWebp, "image/webp");
        MediaObject failingOrphan = saveMediaObject(null, MediaKind.AVATAR, failingObj, "image/webp", dummyWebp.length);

        Instant expiredAt = Instant.now().minus(appProperties.getMedia().getOrphanGrace()).minusSeconds(7200);
        Timestamp expiredUtc = Timestamp.valueOf(LocalDateTime.ofInstant(expiredAt, ZoneOffset.UTC));
        jdbcTemplate.update("UPDATE media_objects SET created_at = ? WHERE id IN (?, ?)",
                expiredUtc, missingOrphan.getId(), failingOrphan.getId());

        ObjectStorage partiallyFailingStorage = new ObjectStorage() {
            @Override
            public StoredObject upload(String key, byte[] data, String contentType) {
                return objectStorage.upload(key, data, contentType);
            }

            @Override
            public void delete(String key) {
                if (failingKey.equals(key)) {
                    throw new IllegalStateException("Simulated R2 503 outage");
                }
                objectStorage.delete(key);
            }

            @Override
            public boolean exists(String key) {
                return objectStorage.exists(key);
            }

            @Override
            public java.io.InputStream openStream(String key) throws java.io.IOException {
                return objectStorage.openStream(key);
            }

            @Override
            public long contentLength(String key) {
                return objectStorage.contentLength(key);
            }

            @Override
            public String publicUrl(String key) {
                return objectStorage.publicUrl(key);
            }
        };

        new OrphanMediaCleaner(mediaObjectRepository, partiallyFailingStorage, appProperties).cleanup();

        assertThat(mediaObjectRepository.findById(missingOrphan.getId())).isEmpty();
        assertThat(mediaObjectRepository.findById(failingOrphan.getId())).isPresent();
        assertThat(objectStorage.exists(failingKey)).isTrue();
    }

    private User saveUser(String prefix, Role role) {
        User u = new User();
        u.setEmail(prefix + "-" + UUID.randomUUID() + "@test.kg");
        u.setPasswordHash("$2a$10$dummyhashfortests000000000000000000000000000000");
        u.setFirstName(prefix);
        u.setLastName("Tester");
        u.setRole(role);
        u.setVerified(true);
        return userRepository.saveAndFlush(u);
    }

    private MediaObject saveMediaObject(User owner, MediaKind kind, ObjectStorage.StoredObject stored,
                                        String mimeType, long size) {
        MediaObject mo = new MediaObject();
        mo.setOwner(owner);
        mo.setKind(kind);
        mo.setObjectKey(stored.key());
        mo.setPublicUrl(stored.publicUrl());
        mo.setMimeType(mimeType);
        mo.setFileSize(size);
        mo.setFormat("webp");
        return mediaObjectRepository.saveAndFlush(mo);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
    }

    private static byte[] samplePdfBytes(String label) {
        String content = "%PDF-1.4\n% " + label + "\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n";
        return content.getBytes(StandardCharsets.UTF_8);
    }

    private static MockMultipartFile samplePngFile(String filename) throws Exception {
        BufferedImage img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
        img.setRGB(0, 0, 0x3366CC);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        return new MockMultipartFile("file", filename, "image/png", baos.toByteArray());
    }
}
