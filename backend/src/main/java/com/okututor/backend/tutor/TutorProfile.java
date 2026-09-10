package com.okututor.backend.tutor;

import com.okututor.backend.location.City;
import com.okututor.backend.location.District;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tutor_profiles")
public class TutorProfile {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(length = 200)
    private String title;

    @Column(name = "short_description", length = 300)
    private String shortDescription;

    @Column(columnDefinition = "text")
    private String about;

    @Enumerated(EnumType.STRING)
    @Column(name = "tutor_type", nullable = false, length = 20)
    private TutorType tutorType = TutorType.STUDENT_TUTOR;

    @Column(length = 500)
    private String education;

    @Column(length = 200)
    private String university;

    @Column(name = "education_details", columnDefinition = "text")
    private String educationDetails;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Column(name = "price_from", precision = 10, scale = 2)
    private BigDecimal priceFrom;

    @Column(name = "price_to", precision = 10, scale = 2)
    private BigDecimal priceTo;

    @Column(nullable = false, length = 8)
    private String currency = "KGS";

    @Column(nullable = false)
    private boolean online = false;

    @Column(nullable = false)
    private boolean offline = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id")
    private City city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id")
    private District district;

    @Column(length = 40)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TutorProfileStatus status = TutorProfileStatus.DRAFT;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "views_count", nullable = false)
    private int viewsCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "seo_title", length = 200)
    private String seoTitle;

    @Column(name = "seo_description", length = 500)
    private String seoDescription;

    @Column(name = "seo_keywords", length = 500)
    private String seoKeywords;

    @Column(name = "noindex", nullable = false)
    private boolean noindex = false;

    @Column(name = "rating", nullable = false, precision = 2, scale = 1)
    private java.math.BigDecimal rating = new java.math.BigDecimal("4.9");

    @Column(name = "reviews_count", nullable = false)
    private int reviewsCount = 0;

    @Column(name = "achievements", columnDefinition = "text")
    private String achievements; // JSON array

    @Column(name = "education_json", columnDefinition = "text")
    private String educationJson; // JSON array

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    // state transitions
    public void submitForModeration() {
        if (status != TutorProfileStatus.DRAFT && status != TutorProfileStatus.REJECTED) {
            throw new IllegalStateException("Can submit only from DRAFT or REJECTED, current: " + status);
        }
        status = TutorProfileStatus.PENDING_MODERATION;
        rejectionReason = null;
    }

    public void approve() {
        if (status != TutorProfileStatus.PENDING_MODERATION && status != TutorProfileStatus.SUSPENDED) {
            throw new IllegalStateException("Can approve only from PENDING_MODERATION or SUSPENDED, current: " + status);
        }
        status = TutorProfileStatus.PUBLISHED;
        publishedAt = Instant.now();
        rejectionReason = null;
    }

    public void reject(String reason) {
        if (status != TutorProfileStatus.PENDING_MODERATION) {
            throw new IllegalStateException("Can reject only from PENDING_MODERATION, current: " + status);
        }
        status = TutorProfileStatus.REJECTED;
        rejectionReason = reason;
    }

    public void suspend(String reason) {
        if (status != TutorProfileStatus.PUBLISHED) {
            throw new IllegalStateException("Can suspend only PUBLISHED, current: " + status);
        }
        status = TutorProfileStatus.SUSPENDED;
        rejectionReason = reason;
    }

    public void restore() {
        if (status != TutorProfileStatus.SUSPENDED) {
            throw new IllegalStateException("Can restore only SUSPENDED, current: " + status);
        }
        status = TutorProfileStatus.PUBLISHED;
        rejectionReason = null;
    }

    // getters/setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String v) { this.firstName = v; }
    public String getLastName() { return lastName; }
    public void setLastName(String v) { this.lastName = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String v) { this.shortDescription = v; }
    public String getAbout() { return about; }
    public void setAbout(String v) { this.about = v; }
    public TutorType getTutorType() { return tutorType; }
    public void setTutorType(TutorType v) { this.tutorType = v; }
    public String getEducation() { return education; }
    public void setEducation(String v) { this.education = v; }
    public String getUniversity() { return university; }
    public void setUniversity(String v) { this.university = v; }
    public String getEducationDetails() { return educationDetails; }
    public void setEducationDetails(String v) { this.educationDetails = v; }
    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer v) { this.experienceYears = v; }
    public BigDecimal getPriceFrom() { return priceFrom; }
    public void setPriceFrom(BigDecimal v) { this.priceFrom = v; }
    public BigDecimal getPriceTo() { return priceTo; }
    public void setPriceTo(BigDecimal v) { this.priceTo = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean v) { this.online = v; }
    public boolean isOffline() { return offline; }
    public void setOffline(boolean v) { this.offline = v; }
    public City getCity() { return city; }
    public void setCity(City v) { this.city = v; }
    public District getDistrict() { return district; }
    public void setDistrict(District v) { this.district = v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone = v; }
    public TutorProfileStatus getStatus() { return status; }
    public void setStatus(TutorProfileStatus v) { this.status = v; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String v) { this.rejectionReason = v; }
    public int getViewsCount() { return viewsCount; }
    public void setViewsCount(int v) { this.viewsCount = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant v) { this.publishedAt = v; }
    public String getSeoTitle() { return seoTitle; }
    public void setSeoTitle(String v) { this.seoTitle = v; }
    public String getSeoDescription() { return seoDescription; }
    public void setSeoDescription(String v) { this.seoDescription = v; }
    public String getSeoKeywords() { return seoKeywords; }
    public void setSeoKeywords(String v) { this.seoKeywords = v; }
    public boolean isNoindex() { return noindex; }
    public void setNoindex(boolean v) { this.noindex = v; }
    public java.math.BigDecimal getRating() { return rating; }
    public void setRating(java.math.BigDecimal v) { this.rating = v; }
    public int getReviewsCount() { return reviewsCount; }
    public void setReviewsCount(int v) { this.reviewsCount = v; }
    public String getAchievements() { return achievements; }
    public void setAchievements(String v) { this.achievements = v; }
    public String getEducationJson() { return educationJson; }
    public void setEducationJson(String v) { this.educationJson = v; }
}
