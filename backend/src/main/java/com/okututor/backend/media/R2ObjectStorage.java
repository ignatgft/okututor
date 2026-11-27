package com.okututor.backend.media;

import com.okututor.backend.common.config.AppProperties;
import com.okututor.backend.common.error.ApiException;
import java.net.URI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Cloudflare R2 через S3-совместимый API.
 * Публичные объекты (UUID-ключи) отдаются с immutable cache; приватные ключи (messages/support/chat/private)
 * всегда закрываются Cache-Control: private, no-store, must-revalidate и отдаются только через backend proxy.
 */
@Component
@ConditionalOnProperty(prefix = "app.media", name = "provider", havingValue = "r2")
public class R2ObjectStorage implements ObjectStorage {

    private static final String PRIVATE_CACHE_CONTROL = "private, no-store, must-revalidate";
    private static final String PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final S3Client s3;
    private final String bucket;
    private final String publicBaseUrl;
    private final String endpoint;
    private final AwsBasicCredentials credentials;

    @Autowired
    public R2ObjectStorage(AppProperties properties) {
        this(properties, null);
    }

    R2ObjectStorage(AppProperties properties, S3Client s3ClientOverride) {
        var r2 = properties.getMedia().getR2();
        // Support both R2_ENDPOINT (task) and R2_ACCOUNT_ID (legacy)
        String ep = r2.getEndpoint();
        if (isBlank(ep) && !isBlank(r2.getAccountId())) {
            ep = "https://%s.r2.cloudflarestorage.com".formatted(r2.getAccountId());
        }
        if (isBlank(ep) || isBlank(r2.getAccessKeyId())
                || isBlank(r2.getSecretAccessKey()) || isBlank(r2.getBucket())) {
            throw new IllegalStateException(
                    "app.media.provider=r2 требует R2_ENDPOINT (или R2_ACCOUNT_ID) + R2_ACCESS_KEY_ID, "
                            + "R2_SECRET_ACCESS_KEY и R2_BUCKET");
        }
        this.endpoint = ep;
        this.bucket = r2.getBucket();
        this.publicBaseUrl = r2.getPublicBaseUrl();
        this.credentials = AwsBasicCredentials.create(r2.getAccessKeyId(), r2.getSecretAccessKey());
        this.s3 = s3ClientOverride != null ? s3ClientOverride : S3Client.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .httpClient(software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient.create())
                .build();
    }

    @Override
    public StoredObject upload(String key, byte[] data, String contentType) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        String cacheControl = MediaKind.isNormalizedPrivateKey(normalizedKey)
                ? PRIVATE_CACHE_CONTROL
                : PUBLIC_CACHE_CONTROL;
        s3.putObject(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(normalizedKey)
                        .contentType(contentType)
                        .cacheControl(cacheControl)
                        .build(),
                RequestBody.fromBytes(data));
        return new StoredObject(normalizedKey, publicUrl(normalizedKey), data.length);
    }

    @Override
    public void delete(String key) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(normalizedKey).build());
        } catch (NoSuchKeyException ignored) {
            // Отсутствующий в R2 объект считаем идемпотентно удалённым.
        }
    }

    @Override
    public boolean exists(String key) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        try {
            s3.headObject(HeadObjectRequest.builder().bucket(bucket).key(normalizedKey).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    @Override
    public String publicUrl(String key) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        // Приватные ключи никогда не должны указывать на публичный CDN в обход MediaFileController.
        if (MediaKind.isNormalizedPrivateKey(normalizedKey)) {
            return "/api/v1/files/media/" + normalizedKey;
        }
        // Для приватного бакета (401 на pub-...r2.dev) используем прокси через бэкенд,
        // который читает из R2 по S3 API с креденшалами и отдает с immutable кешем.
        // Если bucket публичный с кастомным CDN, возвращаем прямой CDN URL;
        // для пустого URL, REPLACE или r2.dev возвращаем прокси.
        if (isBlank(publicBaseUrl) || publicBaseUrl.contains("REPLACE") || publicBaseUrl.contains("r2.dev")) {
            return "/api/v1/files/media/" + normalizedKey;
        }
        return publicBaseUrl.replaceAll("/+$", "") + "/" + normalizedKey;
    }

    @Override
    public byte[] read(String key) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        try {
            var resp = s3.getObject(builder -> builder.bucket(bucket).key(normalizedKey));
            return resp.readAllBytes();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read R2 object " + normalizedKey, e);
        }
    }

    @Override
    public java.io.InputStream openStream(String key) throws java.io.IOException {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        try {
            return s3.getObject(builder -> builder.bucket(bucket).key(normalizedKey));
        } catch (NoSuchKeyException e) {
            throw new java.io.FileNotFoundException("R2 object not found: " + normalizedKey);
        } catch (Exception e) {
            throw new java.io.IOException("Failed to open R2 object " + normalizedKey, e);
        }
    }

    @Override
    public long contentLength(String key) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        try {
            var head = s3.headObject(HeadObjectRequest.builder().bucket(bucket).key(normalizedKey).build());
            return head.contentLength() != null ? head.contentLength() : -1;
        } catch (NoSuchKeyException e) {
            return -1;
        } catch (Exception e) {
            return -1;
        }
    }

    @Override
    public String createPresignedUploadUrl(String key, String contentType, java.time.Duration expiry) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        if (MediaKind.isNormalizedPrivateKey(normalizedKey)) {
            throw ApiException.forbidden("Direct presigned upload is not allowed for private media");
        }
        try (software.amazon.awssdk.services.s3.presigner.S3Presigner presigner = software.amazon.awssdk.services.s3.presigner.S3Presigner.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build()) {
            var req = software.amazon.awssdk.services.s3.model.PutObjectRequest.builder()
                    .bucket(bucket).key(normalizedKey).contentType(contentType)
                    .cacheControl(PUBLIC_CACHE_CONTROL).build();
            var presignReq = software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest.builder()
                    .signatureDuration(expiry).putObjectRequest(req).build();
            return presigner.presignPutObject(presignReq).url().toString();
        }
    }

    @Override
    public String createPresignedDownloadUrl(String key, java.time.Duration expiry) {
        String normalizedKey = MediaKind.normalizeObjectKey(key);
        if (MediaKind.isNormalizedPrivateKey(normalizedKey)) {
            throw ApiException.forbidden("Direct presigned download is not allowed for private media");
        }
        try (software.amazon.awssdk.services.s3.presigner.S3Presigner presigner = software.amazon.awssdk.services.s3.presigner.S3Presigner.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build()) {
            var req = software.amazon.awssdk.services.s3.model.GetObjectRequest.builder().bucket(bucket).key(normalizedKey).build();
            var presignReq = software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.builder()
                    .signatureDuration(expiry).getObjectRequest(req).build();
            return presigner.presignGetObject(presignReq).url().toString();
        }
    }

    private static boolean isBlank(String v) {
        return v == null || v.isBlank();
    }
}
