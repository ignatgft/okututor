package com.okututor.backend.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.okututor.backend.common.config.AppProperties;
import com.okututor.backend.common.error.ApiException;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

class R2ObjectStorageTest {

    private S3Client s3Client;
    private R2ObjectStorage storage;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        AppProperties props = new AppProperties();
        props.getMedia().getR2().setEndpoint("https://r2.example.com");
        props.getMedia().getR2().setAccessKeyId("test-access-key");
        props.getMedia().getR2().setSecretAccessKey("test-secret-key");
        props.getMedia().getR2().setBucket("okututor-test");
        props.getMedia().getR2().setPublicBaseUrl("https://cdn.okututor.kg");

        storage = new R2ObjectStorage(props, s3Client);
    }

    @Test
    void publicUrl_neverReturnsCdnUrlForPrivateKeys() {
        assertThat(storage.publicUrl("messages/attachments/secret.pdf"))
                .isEqualTo("/api/v1/files/media/messages/attachments/secret.pdf");
        assertThat(storage.publicUrl("/messages/attachment-thumb/secret.webp"))
                .isEqualTo("/api/v1/files/media/messages/attachment-thumb/secret.webp");
        assertThat(storage.publicUrl("support/ticket-1/doc.pdf"))
                .isEqualTo("/api/v1/files/media/support/ticket-1/doc.pdf");
        assertThat(storage.publicUrl("chat/conv-1/photo.webp"))
                .isEqualTo("/api/v1/files/media/chat/conv-1/photo.webp");
        assertThat(storage.publicUrl("/private/audit/export.csv"))
                .isEqualTo("/api/v1/files/media/private/audit/export.csv");
    }

    @Test
    void publicUrl_returnsCdnUrlForPublicKeys() {
        String tutorUrl = storage.publicUrl("tutors/u-1/profile.webp");
        String avatarUrl = storage.publicUrl("/users/u-1/avatar.webp");

        assertThat(tutorUrl).startsWith("https://cdn.okututor.kg/");
        assertThat(tutorUrl).endsWith("tutors/u-1/profile.webp");
        assertThat(avatarUrl).startsWith("https://cdn.okututor.kg/");
        assertThat(avatarUrl).endsWith("users/u-1/avatar.webp");
    }

    @Test
    void upload_privateKeySetsNoStoreCacheControlAndReturnsProxyUrl() {
        byte[] bytes = "pdf-data".getBytes();
        ObjectStorage.StoredObject stored = storage.upload(
                "/messages/attachments/ticket-doc.pdf", bytes, "application/pdf");

        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        PutObjectRequest req = captor.getValue();

        assertThat(req.bucket()).isEqualTo("okututor-test");
        assertThat(req.key()).isEqualTo("messages/attachments/ticket-doc.pdf");
        assertThat(req.cacheControl()).isEqualTo("private, no-store, must-revalidate");
        assertThat(stored.key()).isEqualTo("messages/attachments/ticket-doc.pdf");
        assertThat(stored.publicUrl()).isEqualTo("/api/v1/files/media/messages/attachments/ticket-doc.pdf");
    }

    @Test
    void upload_publicKeySetsImmutableCacheControlAndReturnsCdnUrl() {
        byte[] bytes = "webp-data".getBytes();
        ObjectStorage.StoredObject stored = storage.upload(
                "users/user-1/avatar.webp", bytes, "image/webp");

        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        PutObjectRequest req = captor.getValue();

        assertThat(req.cacheControl()).isEqualTo("public, max-age=31536000, immutable");
        assertThat(stored.publicUrl()).startsWith("https://cdn.okututor.kg/");
        assertThat(stored.publicUrl()).endsWith("users/user-1/avatar.webp");
    }

    @Test
    void createPresignedUrls_blockPrivateKeys() {
        for (String key : List.of(
                "messages/attachments/doc.pdf",
                "/messages/attachment-thumb/thumb.webp",
                "support/12/file.pdf",
                "chat/abc/photo.png",
                "/private/key.bin",
                "Messages/case/doc.pdf"
        )) {
            assertThatThrownBy(() -> storage.createPresignedUploadUrl(
                    key, "application/pdf", Duration.ofMinutes(5)))
                    .isInstanceOf(ApiException.class)
                    .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN))
                    .hasMessageContaining("private media");

            assertThatThrownBy(() -> storage.createPresignedDownloadUrl(
                    key, Duration.ofMinutes(5)))
                    .isInstanceOf(ApiException.class)
                    .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN))
                    .hasMessageContaining("private media");
        }
    }

    @Test
    void rejectsSuspiciousTraversalEncodedAndAmbiguousKeys() {
        List<String> suspiciousKeys = List.of(
                "tutors/../messages/secret.pdf",
                "messages\\attachments\\secret.pdf",
                "%2e%2e",
                "tutors/%2e%2e/messages/secret.pdf",
                "%252e%252e",
                "tutors/%252e%252e/messages/secret.pdf",
                "messages//attachments/secret.pdf",
                "//messages/attachments/secret.pdf",
                "///users/u-1/avatar.webp",
                "./messages/secret.pdf",
                "users/./avatar.webp",
                "messages/",
                "/",
                " "
        );
        for (String badKey : suspiciousKeys) {
            assertThatThrownBy(() -> storage.publicUrl(badKey))
                    .as("publicUrl should reject %s", badKey)
                    .isInstanceOf(ApiException.class)
                    .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));
            assertThatThrownBy(() -> storage.upload(badKey, new byte[]{1}, "application/pdf"))
                    .isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> storage.delete(badKey))
                    .isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> storage.exists(badKey))
                    .isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> storage.openStream(badKey))
                    .isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> storage.contentLength(badKey))
                    .isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> storage.createPresignedUploadUrl(badKey, "image/webp", Duration.ofMinutes(5)))
                    .isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> storage.createPresignedDownloadUrl(badKey, Duration.ofMinutes(5)))
                    .isInstanceOf(ApiException.class);
        }
        verifyNoInteractions(s3Client);
    }

    @Test
    void publicBaseUrl_edgeCasesAndKeyNormalizationConsistency() {
        AppProperties r2DevProps = new AppProperties();
        r2DevProps.getMedia().getR2().setEndpoint("https://r2.example.com");
        r2DevProps.getMedia().getR2().setAccessKeyId("k");
        r2DevProps.getMedia().getR2().setSecretAccessKey("s");
        r2DevProps.getMedia().getR2().setBucket("b");
        r2DevProps.getMedia().getR2().setPublicBaseUrl("https://pub-123.r2.dev");
        assertThat(new R2ObjectStorage(r2DevProps, s3Client).publicUrl("tutors/u-1/profile.webp"))
                .isEqualTo("/api/v1/files/media/tutors/u-1/profile.webp");

        r2DevProps.getMedia().getR2().setPublicBaseUrl("https://cdn.okututor.kg///");
        assertThat(new R2ObjectStorage(r2DevProps, s3Client).publicUrl("/tutors/u-1/profile.webp"))
                .isEqualTo("https://cdn.okututor.kg/tutors/u-1/profile.webp");

        when(s3Client.headObject(any(HeadObjectRequest.class)))
                .thenReturn(HeadObjectResponse.builder().contentLength(42L).build());
        assertThat(storage.exists("/users/u-1/avatar.webp")).isTrue();
        ArgumentCaptor<HeadObjectRequest> headCaptor = ArgumentCaptor.forClass(HeadObjectRequest.class);
        verify(s3Client).headObject(headCaptor.capture());
        assertThat(headCaptor.getValue().key()).isEqualTo("users/u-1/avatar.webp");

        doThrow(NoSuchKeyException.builder().message("missing").build())
                .when(s3Client).deleteObject(any(DeleteObjectRequest.class));
        storage.delete("/messages/attachments/absent.pdf");
        ArgumentCaptor<DeleteObjectRequest> deleteCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(deleteCaptor.capture());
        assertThat(deleteCaptor.getValue().key()).isEqualTo("messages/attachments/absent.pdf");
    }
}
