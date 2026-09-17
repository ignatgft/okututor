package com.okututor.backend.media;

import com.okututor.backend.common.error.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
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

    private final ObjectStorage storage;

    public MediaFileController(ObjectStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/api/v1/files/media/{*key}")
    public ResponseEntity<InputStreamResource> read(@PathVariable String key, HttpServletRequest request) {
        String normalized = key.startsWith("/") ? key.substring(1) : key;
        // path traversal guard — S3 keys may contain ".." literally, block after decode; также нормализуем двойное кодирование %2e
        String lower = normalized.toLowerCase(java.util.Locale.ROOT);
        if (lower.contains("..") || normalized.contains("//") || normalized.contains("\\") || lower.contains("%2e")) {
            throw ApiException.notFound("File not found");
        }
        // Private objects (chat attachments, support) require authentication
        if (isPrivateKey(normalized)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean authed = auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
            if (!authed) {
                throw ApiException.unauthorized("Authentication required for this file");
            }
        }
        // ETag handling (immutable objects — key contains UUID)
        String etag = "W/\"" + Integer.toHexString(normalized.hashCode()) + "\"";
        String ifNoneMatch = request.getHeader(HttpHeaders.IF_NONE_MATCH);
        if (etag.equals(ifNoneMatch)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        }
        InputStream is;
        long len = -1;
        try {
            len = storage.contentLength(normalized);
            is = storage.openStream(normalized);
        } catch (FileNotFoundException e) {
            throw ApiException.notFound("File not found");
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw ApiException.notFound("File not found");
        } catch (IOException e) {
            throw ApiException.notFound("File not found");
        }
        InputStreamResource resource = new InputStreamResource(is);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(contentTypeOf(normalized))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable())
                .eTag(etag);
        if (len >= 0) builder.contentLength(len);
        // Future: Range support (P2) — для видео/больших файлов добавить Accept-Ranges и 206 handling
        builder.header(HttpHeaders.ACCEPT_RANGES, "bytes");
        return builder.body(resource);
    }

    private static boolean isPrivateKey(String key) {
        String lower = key.toLowerCase(java.util.Locale.ROOT);
        return lower.startsWith("messages/") || lower.startsWith("support/") || lower.startsWith("chat/")
                || lower.startsWith("private/");
    }

    private static MediaType contentTypeOf(String key) {
        String lower = key.toLowerCase(java.util.Locale.ROOT);
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
