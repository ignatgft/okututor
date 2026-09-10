package com.okututor.backend.seo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "seo_settings")
public class SeoSettings {

    @Id
    private UUID id;

    @Column(name = "site_title", nullable = false, length = 200)
    private String siteTitle;

    @Column(name = "site_description", nullable = false, length = 500)
    private String siteDescription;

    @Column(name = "site_keywords", nullable = false, length = 500)
    private String siteKeywords;

    @Column(name = "canonical_base_url", nullable = false, length = 200)
    private String canonicalBaseUrl;

    @Column(name = "robots_txt", nullable = false, columnDefinition = "text")
    private String robotsTxt;

    @Column(name = "og_image_url", nullable = false, length = 500)
    private String ogImageUrl;

    @Column(name = "og_locale", nullable = false, length = 10)
    private String ogLocale;

    @Column(name = "structured_data", columnDefinition = "text")
    private String structuredData;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSiteTitle() { return siteTitle; }
    public void setSiteTitle(String v) { this.siteTitle = v; }
    public String getSiteDescription() { return siteDescription; }
    public void setSiteDescription(String v) { this.siteDescription = v; }
    public String getSiteKeywords() { return siteKeywords; }
    public void setSiteKeywords(String v) { this.siteKeywords = v; }
    public String getCanonicalBaseUrl() { return canonicalBaseUrl; }
    public void setCanonicalBaseUrl(String v) { this.canonicalBaseUrl = v; }
    public String getRobotsTxt() { return robotsTxt; }
    public void setRobotsTxt(String v) { this.robotsTxt = v; }
    public String getOgImageUrl() { return ogImageUrl; }
    public void setOgImageUrl(String v) { this.ogImageUrl = v; }
    public String getOgLocale() { return ogLocale; }
    public void setOgLocale(String v) { this.ogLocale = v; }
    public String getStructuredData() { return structuredData; }
    public void setStructuredData(String v) { this.structuredData = v; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant v) { this.updatedAt = v; }
}
