package com.okututor.backend.location;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cities")
public class City {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String slug;

    @Column(name = "name_ru", nullable = false, length = 100)
    private String nameRu;

    @Column(name = "name_kg", length = 100)
    private String nameKg;

    @Column(length = 64)
    private String country = "KG";

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
    public String getNameKg() { return nameKg; }
    public void setNameKg(String v) { this.nameKg = v; }
    public String getCountry() { return country; }
    public void setCountry(String v) { this.country = v; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { this.sortOrder = v; }
    public Instant getCreatedAt() { return createdAt; }
}
