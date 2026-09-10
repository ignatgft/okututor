package com.okututor.backend.tutor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tutor_profile_languages")
public class TutorProfileLanguage {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "profile_id", nullable = false) private TutorProfile profile;
    @Column(nullable = false, length = 30) private String language;
    public TutorProfileLanguage() {}
    public TutorProfileLanguage(TutorProfile p, String lang) { this.id = UUID.randomUUID(); this.profile = p; this.language = lang; }
    public UUID getId() { return id; }
    public TutorProfile getProfile() { return profile; }
    public String getLanguage() { return language; }
}
