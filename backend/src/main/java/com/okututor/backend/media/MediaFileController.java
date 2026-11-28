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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    private static final Logger log = LoggerFactory.getLogger(MediaFileController.class);
    private static final String PRIVATE_CACHE_CONTROL = "private, no-store, must-revalidate";
    private static final String PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final ObjectStorage storage;
    private final MediaObjectRepository mediaObjectRepository;
    private final SupportTicketMessageRepository supportTicketMessageRepository;

    public MediaFileController(ObjectStorage storage,
                               MediaObjectRepository mediaObjectRepository,
                               SupportTicketMessageRepository supportTicketMessageRepository) {
        this.storage = storage;
        this.mediaObjectRepository = mediaObjectRepository;
        this.supportTicketMessageRepository = supportTicketMessageRepository;
    }

    @GetMapping("/api/v1/files/media/{*key}")
    public ResponseEntity<InputStreamResource> read(@PathVariable String key, HttpServletRequest request) {
        final String normalized;
        try {
            normalized = MediaKind.normalizeObjectKey(key);
        } catch (ApiException ex) {
            throw ApiException.notFound("File not found");
        }

        boolean isPrivate = MediaKind.isNormalizedPrivateKey(normalized);

        // Private objects (support attachments, private prefixes) require authentication and owner/participant/admin authorization
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
                MediaObject media = mediaObjectRepository.findByObjectKey(normalized)
                        .orElseThrow(() -> ApiException.forbidden("You do not have permission to access this file"));
                boolean isOwner = media.getOwner() != null && media.getOwner().getId().equals(principal.id());
                if (!isOwner && !isAuthorizedParticipant(media.getId(), principal.id())) {
                    throw ApiException.forbidden("You do not have permission to access this file");
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
        if (supportTicketMessageRepository == null) {
            return false;
        }
        try {
            return supportTicketMessageRepository.isAuthorizedTicketParticipant(mediaId, userId);
        } catch (Exception ex) {
            // fail-closed без раскрытия PII в логах
            log.error("Media authorization query failed for mediaId={}: {}", mediaId, ex.getMessage());
            return false;
        }
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
