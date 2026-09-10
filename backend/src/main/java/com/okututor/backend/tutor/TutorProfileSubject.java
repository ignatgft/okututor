package com.okututor.backend.tutor;

import com.okututor.backend.subject.Subject;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tutor_profile_subjects")
public class TutorProfileSubject {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private TutorProfile profile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    public TutorProfileSubject() {}
    public TutorProfileSubject(TutorProfile profile, Subject subject) {
        this.id = UUID.randomUUID();
        this.profile = profile;
        this.subject = subject;
    }

    public UUID getId() { return id; }
    public TutorProfile getProfile() { return profile; }
    public Subject getSubject() { return subject; }
}
