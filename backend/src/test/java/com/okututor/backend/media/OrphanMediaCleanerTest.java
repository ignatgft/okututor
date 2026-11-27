package com.okututor.backend.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.okututor.backend.common.config.AppProperties;
import com.okututor.backend.user.User;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrphanMediaCleanerTest {

    @Test
    @SuppressWarnings("unchecked")
    void cleanup_preservesMessageAttachmentsAndCurrentAvatarWhileDeletingReplacedAvatarAndUnreferencedOrphan() {
        MediaObjectRepository mediaRepo = mock(MediaObjectRepository.class);
        ObjectStorage storage = mock(ObjectStorage.class);
        AppProperties props = new AppProperties();

        OrphanMediaCleaner cleaner = new OrphanMediaCleaner(mediaRepo, storage, props);

        User owner = new User();
        owner.setId(UUID.randomUUID());
        owner.setAvatarUrl("/api/v1/files/media/users/u1/current-avatar.webp");

        MediaObject currentAvatar = media(MediaKind.AVATAR, "users/u1/current-avatar.webp",
                "/api/v1/files/media/users/u1/current-avatar.webp", owner);
        MediaObject replacedAvatar = media(MediaKind.AVATAR, "users/u1/old-avatar.webp",
                "/api/v1/files/media/users/u1/old-avatar.webp", owner);
        // Defense in depth: even if the repo returned a non-AVATAR owned record, cleaner must skip it.
        MediaObject leakedMessageAttachment = media(MediaKind.MESSAGE_ATTACHMENT, "messages/u1/secret.pdf",
                "/api/v1/files/media/messages/u1/secret.pdf", owner);
        MediaObject leakedProfilePhoto = media(MediaKind.PROFILE, "tutors/u1/profile.webp",
                "/api/v1/files/media/tutors/u1/profile.webp", owner);
        MediaObject unreferencedOrphan = media(MediaKind.AVATAR, "users/orphan/unused.webp",
                "/api/v1/files/media/users/orphan/unused.webp", null);

        when(mediaRepo.findUnreferencedOrphansBefore(any(Instant.class)))
                .thenReturn(List.of(unreferencedOrphan));
        when(mediaRepo.findByKindAndOwnerIsNotNullAndCreatedAtBefore(
                eq(MediaKind.AVATAR), any(Instant.class)))
                .thenReturn(List.of(currentAvatar, replacedAvatar, leakedMessageAttachment, leakedProfilePhoto));

        cleaner.cleanup();

        verify(mediaRepo).findUnreferencedOrphansBefore(any(Instant.class));
        verify(mediaRepo).findByKindAndOwnerIsNotNullAndCreatedAtBefore(
                eq(MediaKind.AVATAR), any(Instant.class));

        ArgumentCaptor<List<MediaObject>> deletedCaptor = ArgumentCaptor.forClass(List.class);
        verify(mediaRepo).deleteAllInBatch(deletedCaptor.capture());
        assertThat(deletedCaptor.getValue())
                .containsExactlyInAnyOrder(unreferencedOrphan, replacedAvatar);
        verifyNoMoreInteractions(mediaRepo);

        verify(storage).delete("users/orphan/unused.webp");
        verify(storage).delete("users/u1/old-avatar.webp");
        verify(storage, org.mockito.Mockito.never()).delete("users/u1/current-avatar.webp");
        verify(storage, org.mockito.Mockito.never()).delete("messages/u1/secret.pdf");
        verify(storage, org.mockito.Mockito.never()).delete("tutors/u1/profile.webp");
        verifyNoMoreInteractions(storage);
    }

    @Test
    @SuppressWarnings("unchecked")
    void cleanup_preservesDbRecordWhenStorageDeleteFails() {
        MediaObjectRepository mediaRepo = mock(MediaObjectRepository.class);
        ObjectStorage storage = mock(ObjectStorage.class);
        AppProperties props = new AppProperties();

        OrphanMediaCleaner cleaner = new OrphanMediaCleaner(mediaRepo, storage, props);

        MediaObject failedOrphan = media(MediaKind.AVATAR, "users/orphan/r2-error.webp",
                "/api/v1/files/media/users/orphan/r2-error.webp", null);
        MediaObject deletedOrphan = media(MediaKind.AVATAR, "users/orphan/ok.webp",
                "/api/v1/files/media/users/orphan/ok.webp", null);

        when(mediaRepo.findUnreferencedOrphansBefore(any(Instant.class)))
                .thenReturn(List.of(failedOrphan, deletedOrphan));
        when(mediaRepo.findByKindAndOwnerIsNotNullAndCreatedAtBefore(
                eq(MediaKind.AVATAR), any(Instant.class)))
                .thenReturn(List.of());
        doThrow(new IllegalStateException("R2 503"))
                .when(storage).delete("users/orphan/r2-error.webp");

        cleaner.cleanup();

        ArgumentCaptor<List<MediaObject>> deletedCaptor = ArgumentCaptor.forClass(List.class);
        verify(mediaRepo).deleteAllInBatch(deletedCaptor.capture());
        assertThat(deletedCaptor.getValue()).containsExactly(deletedOrphan);
    }

    @Test
    void cleanup_neverCallsDeleteAllInBatchWhenAllStorageDeletesFail() {
        MediaObjectRepository mediaRepo = mock(MediaObjectRepository.class);
        ObjectStorage storage = mock(ObjectStorage.class);
        AppProperties props = new AppProperties();

        OrphanMediaCleaner cleaner = new OrphanMediaCleaner(mediaRepo, storage, props);
        MediaObject failedOrphan = media(MediaKind.AVATAR, "users/orphan/r2-timeout.webp",
                "/api/v1/files/media/users/orphan/r2-timeout.webp", null);

        when(mediaRepo.findUnreferencedOrphansBefore(any(Instant.class)))
                .thenReturn(List.of(failedOrphan));
        when(mediaRepo.findByKindAndOwnerIsNotNullAndCreatedAtBefore(
                eq(MediaKind.AVATAR), any(Instant.class)))
                .thenReturn(List.of());
        doThrow(new IllegalStateException("R2 timeout"))
                .when(storage).delete("users/orphan/r2-timeout.webp");

        cleaner.cleanup();

        verify(mediaRepo, never()).deleteAllInBatch(any());
    }

    private static MediaObject media(MediaKind kind, String key, String publicUrl, User owner) {
        MediaObject m = new MediaObject();
        m.setId(UUID.randomUUID());
        m.setKind(kind);
        m.setObjectKey(key);
        m.setPublicUrl(publicUrl);
        m.setOwner(owner);
        return m;
    }
}
