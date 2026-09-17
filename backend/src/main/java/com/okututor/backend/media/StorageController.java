package com.okututor.backend.media;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Presigned upload flow for R2 (S3-compatible).
 * Frontend never sees R2 secrets — backend validates and issues a short-lived PUT URL.
 */
@RestController
@RequestMapping("/api/v1/storage")
public class StorageController {

    private final ObjectStorage storage;
    private final com.okututor.backend.common.config.AppProperties props;
    private final com.okututor.backend.common.ratelimit.RateLimitService rateLimitService;

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif");

    public StorageController(ObjectStorage storage, com.okututor.backend.common.config.AppProperties props,
                             com.okututor.backend.common.ratelimit.RateLimitService rateLimitService) {
        this.storage = storage;
        this.props = props;
        this.rateLimitService = rateLimitService;
    }

    public record UploadUrlRequest(String type, String contentType, Long size, String extension) {}
    public record UploadUrlResponse(String objectKey, String uploadUrl, String publicUrl, long expiresIn) {}

    @PostMapping("/upload-url")
    public UploadUrlResponse createUploadUrl(@AuthenticationPrincipal UserPrincipal principal,
                                             @RequestBody UploadUrlRequest req) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        rateLimitService.checkStorageUpload(principal.id().toString());

        String type = req.type() == null ? "AVATAR" : req.type().toUpperCase();
        String contentType = req.contentType() == null ? "image/webp" : req.contentType().toLowerCase();
        long size = req.size() == null ? 0 : req.size();

        // Validate type
        MediaKind kind;
        try {
            kind = MediaKind.valueOf(type);
        } catch (Exception e) {
            // Map legacy AVATAR etc. to MediaKind
            kind = switch (type) {
                case "AVATAR" -> MediaKind.AVATAR;
                case "PROFILE", "RESUME", "RESUME_IMAGE" -> MediaKind.PROFILE;
                case "COURSE_COVER" -> MediaKind.COURSE_COVER;
                case "MESSAGE_ATTACHMENT" -> MediaKind.MESSAGE_ATTACHMENT;
                default -> throw ApiException.validation("Unknown type: " + type);
            };
        }

        // Validate content type
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw ApiException.validation("Unsupported content type: " + contentType);
        }
        // Validate size per kind
        long max = switch (kind) {
            case AVATAR -> props.getMedia().getMaxAvatarSize();
            case COURSE_COVER -> props.getMedia().getMaxCourseCoverSize();
            case PROFILE -> props.getMedia().getMaxProfileSize();
            case MESSAGE_ATTACHMENT, MESSAGE_THUMBNAIL -> props.getMedia().getMaxMessageAttachmentSize();
        };
        if (size > 0 && size > max) {
            throw ApiException.validation("File too large, max " + max + " bytes");
        }

        // Generate objectKey securely — never trust frontend key
        String ext = req.extension() != null ? req.extension().toLowerCase() : contentTypeToExt(contentType);
        if (!ALLOWED_EXT.contains(ext)) ext = "webp";
        String objectKey = kind.objectKey(principal.id(), ext);

        // Security: ensure prefix matches owner
        if (!objectKey.startsWith(kind.name().toLowerCase() + "/") && !objectKey.startsWith("users/") && !objectKey.startsWith("avatars/") && !objectKey.startsWith("resumes/")) {
            // MediaKind already enforces prefix, but double-check
            if (!objectKey.contains(principal.id().toString())) {
                throw ApiException.forbidden("Invalid object key prefix");
            }
        }

        Duration expiry = Duration.ofMinutes(15);
        String uploadUrl;
        try {
            uploadUrl = storage.createPresignedUploadUrl(objectKey, contentType, expiry);
        } catch (UnsupportedOperationException e) {
            // Local provider fallback — return direct backend upload hint
            throw ApiException.validation("Presigned upload not supported for provider=" + props.getMedia().getProvider() + ". Use multipart POST /api/v1/users/me/avatar");
        }
        String publicUrl = storage.publicUrl(objectKey);
        return new UploadUrlResponse(objectKey, uploadUrl, publicUrl, expiry.toSeconds());
    }

    @GetMapping("/public-url")
    public Map<String, String> publicUrl(@RequestParam String key) {
        // Simple helper to resolve public URL for a given objectKey (no auth needed for public objects)
        return Map.of("publicUrl", storage.publicUrl(key), "objectKey", key);
    }

    private String contentTypeToExt(String ct) {
        return switch (ct) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> "webp";
        };
    }
}
