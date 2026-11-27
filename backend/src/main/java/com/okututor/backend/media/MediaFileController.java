package com.okututor.backend.media;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.support.SupportTicketMessageRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * раздача media-объектов: для local — с диска, для r2 — проксирует из Cloudflare R2
 * (нужно когда bucket не публичный или нужно кешировать через бэкенд).
 * Для публичного R2 фронт может грузить напрямую по publicUrl, но этот эндпоинт всегда работает.
 */
@RestController
public class MediaFileController {

    private static final String PRIVATE_CACHE_CONTROL = "private, no-store, must-revalidate";
    private static final String PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final ObjectStorage storage;
    private final MediaObjectRepository mediaObjectRepository;
    private final SupportTicketMessageRepository supportTicketMessageRepository;
    private final JdbcTemplate jdbcTemplate;

    public MediaFileController(ObjectStorage storage,
                               MediaObjectRepository mediaObjectRepository,
                               SupportTicketMessageRepository supportTicketMessageRepository,
                               @Nullable JdbcTemplate jdbcTemplate) {
        this.storage = storage;
        this.mediaObjectRepository = mediaObjectRepository;
        this.supportTicketMessageRepository = supportTicketMessageRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/v1/files/media/{*key}")
    public ResponseEntity<InputStreamResource> read(@PathVariable String key, HttpServletRequest request) {
        String normalized = key.startsWith("/") ? key.substring(1) : key;
        // path traversal guard — S3 keys may contain ".." literally, block after decode; также нормализуем двойное кодирование %2e
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("..") || normalized.contains("//") || normalized.contains("\\") || lower.contains("%2e")) {
            throw ApiException.notFound("File not found");
        }

        boolean isPrivate = isPrivateKey(normalized);

        // Private objects (chat attachments, support) require authentication and ownership/recipient/admin authorization
        if (isPrivate) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean authed = auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
            if (!authed) {
                throw ApiException.unauthorized("Authentication required for this file");
            }
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
            if (!isAdmin) {
                if (!(auth.getPrincipal() instanceof UserPrincipal principal)) {
                    throw ApiException.unauthorized("Authentication required for this file");
                }
                var mediaOpt = mediaObjectRepository.findByObjectKey(normalized);
                if (mediaOpt.isEmpty() || mediaOpt.get().getOwner() == null) {
                    throw ApiException.forbidden("You do not have permission to access this file");
                }
                MediaObject media = mediaOpt.get();
                boolean isOwner = media.getOwner().getId().equals(principal.id());
                if (!isOwner) {
                    boolean isAuthorized = isAuthorizedParticipant(media.getId(), principal.id());
                    if (!isAuthorized) {
                        throw ApiException.forbidden("You do not have permission to access this file");
                    }
                }
            }
        }

        // ETag handling (immutable objects — key contains UUID)
        String etag = "W/\"" + Integer.toHexString(normalized.hashCode()) + "\"";
        String ifNoneMatch = request.getHeader(HttpHeaders.IF_NONE_MATCH);
        if (etag.equals(ifNoneMatch)) {
            ResponseEntity.BodyBuilder notModBuilder = ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag);
            applyCacheHeaders(notModBuilder, isPrivate);
            return notModBuilder.build();
        }

        InputStream is;
        long len = -1;
        try {
            len = storage.contentLength(normalized);
            is = storage.openStream(normalized);
        } catch (FileNotFoundException | IllegalArgumentException | IllegalStateException e) {
            throw ApiException.notFound("File not found");
        } catch (IOException e) {
            throw ApiException.notFound("File not found");
        }

        InputStreamResource resource = new InputStreamResource(is);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(contentTypeOf(normalized))
                .eTag(etag);
        applyCacheHeaders(builder, isPrivate);

        if (len >= 0) builder.contentLength(len);
        // Future: Range support (P2) — для видео/больших файлов добавить Accept-Ranges и 206 handling
        builder.header(HttpHeaders.ACCEPT_RANGES, "bytes");
        return builder.body(resource);
    }

    private void applyCacheHeaders(ResponseEntity.HeadersBuilder<?> builder, boolean isPrivate) {
        if (isPrivate) {
            builder.header(HttpHeaders.CACHE_CONTROL, PRIVATE_CACHE_CONTROL);
            builder.header(HttpHeaders.PRAGMA, "no-cache");
        } else {
            builder.header(HttpHeaders.CACHE_CONTROL, PUBLIC_CACHE_CONTROL);
        }
    }

    private boolean isAuthorizedParticipant(UUID mediaId, UUID userId) {
        try {
            if (supportTicketMessageRepository != null &&
                    supportTicketMessageRepository.isAuthorizedTicketParticipant(mediaId, userId)) {
                return true;
            }
        } catch (Exception ignored) {
            // fail-closed on query exception
        }

        if (jdbcTemplate != null) {
            try {
                Integer count = jdbcTemplate.queryForObject(
                        """
                        SELECT count(*) FROM messages m
                        JOIN conversations c ON m.conversation_id = c.id
                        JOIN message_attachments a ON m.attachment_id = a.id
                        WHERE (a.media_id = ? OR a.thumbnail_media_id = ?)
                        AND (c.user1_id = ? OR c.user2_id = ?)
                        """,
                        Integer.class, mediaId, mediaId, userId, userId);
                if (count != null && count > 0) {
                    return true;
                }
            } catch (Exception ignored) {
                // fail-closed
            }
        }
        return false;
    }

    private static boolean isPrivateKey(String key) {
        String lower = key.toLowerCase(Locale.ROOT);
        return lower.startsWith("messages/") || lower.startsWith("support/") || lower.startsWith("chat/")
                || lower.startsWith("private/");
    }

    private static MediaType contentTypeOf(String key) {
        String lower = key.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".pdf")) return MediaType.parseMediaType("application/pdf");
        if (lower.endsWith(".doc")) return MediaType.parseMediaType("application/msword");
        if (lower.endsWith(".docx")) return MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        if (lower.endsWith(".txt")) return MediaType.TEXT_PLAIN;
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
