package com.okututor.backend.level;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "levels")
public class Level {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String slug;

    @Column(name = "name_ru", nullable = false, length = 100)
    private String nameRu;

    @Column(nullable = false, length = 20)
    private String tier; // SCHOOL, UNIVERSITY, ADULT, ORT

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String v) { this.slug = v; }
    public String getNameRu() { return nameRu; }
    public void setNameRu(String v) { this.nameRu = v; }
    public String getTier() { return tier; }
    public void setTier(String v) { this.tier = v; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { this.sortOrder = v; }
    public Instant getCreatedAt() { return createdAt; }
}
