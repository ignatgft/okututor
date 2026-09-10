package com.okututor.backend.tutor;

import com.okututor.backend.media.MediaObject;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tutor_profile_media")
public class TutorProfileMedia {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "profile_id", nullable = false) private TutorProfile profile;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "media_id", nullable = false, unique = true) private MediaObject media;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @Column(name = "is_primary", nullable = false) private boolean primary;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); if (createdAt == null) createdAt = Instant.now(); }
    public TutorProfileMedia() {}
    public TutorProfileMedia(TutorProfile p, MediaObject m, int order, boolean isPrimary) { this.id = UUID.randomUUID(); this.profile = p; this.media = m; this.sortOrder = order; this.primary = isPrimary; this.createdAt = Instant.now(); }
    public UUID getId() { return id; }
    public TutorProfile getProfile() { return profile; }
    public MediaObject getMedia() { return media; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { this.sortOrder = v; }
    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean v) { this.primary = v; }
}
