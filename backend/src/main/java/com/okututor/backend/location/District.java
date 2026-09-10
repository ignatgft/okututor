package com.okututor.backend.location;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "districts", uniqueConstraints = @UniqueConstraint(columnNames = {"city_id", "slug"}))
public class District {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "city_id", nullable = false)
    private City city;

    @Column(nullable = false, length = 64)
    private String slug;

    @Column(name = "name_ru", nullable = false, length = 100)
    private String nameRu;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public City getCity() { return city; }
    public void setCity(City city) { this.city = city; }
    public String getSlug() { return slug; }
    public void setSlug(String v) { this.slug = v; }
    public String getNameRu() { return nameRu; }
    public void setNameRu(String v) { this.nameRu = v; }
    public Instant getCreatedAt() { return createdAt; }
}
