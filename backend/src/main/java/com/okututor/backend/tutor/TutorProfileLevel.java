package com.okututor.backend.tutor;

import com.okututor.backend.level.Level;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tutor_profile_levels")
public class TutorProfileLevel {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "profile_id", nullable = false) private TutorProfile profile;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "level_id", nullable = false) private Level level;
    public TutorProfileLevel() {}
    public TutorProfileLevel(TutorProfile p, Level l) { this.id = UUID.randomUUID(); this.profile = p; this.level = l; }
    public UUID getId() { return id; }
    public TutorProfile getProfile() { return profile; }
    public Level getLevel() { return level; }
}
