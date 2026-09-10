package com.okututor.backend.request;

import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tutor_requests")
public class TutorRequest {

    public enum Status { NEW, VIEWED, CONTACTED, CLOSED }

    @Id private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tutor_profile_id", nullable = false)
    private TutorProfile tutorProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tutor_user_id", nullable = false)
    private User tutorUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_user_id")
    private User studentUser;

    @Column(name = "student_name", nullable = false, length = 200)
    private String studentName;

    @Column(name = "student_contact", nullable = false, length = 200)
    private String studentContact;

    @Column(columnDefinition = "text")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.NEW;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public TutorProfile getTutorProfile() { return tutorProfile; }
    public void setTutorProfile(TutorProfile v) { this.tutorProfile = v; }
    public User getTutorUser() { return tutorUser; }
    public void setTutorUser(User v) { this.tutorUser = v; }
    public User getStudentUser() { return studentUser; }
    public void setStudentUser(User v) { this.studentUser = v; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String v) { this.studentName = v; }
    public String getStudentContact() { return studentContact; }
    public void setStudentContact(String v) { this.studentContact = v; }
    public String getMessage() { return message; }
    public void setMessage(String v) { this.message = v; }
    public Status getStatus() { return status; }
    public void setStatus(Status v) { this.status = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
