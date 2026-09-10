package com.okututor.backend.seo;

import com.okututor.backend.tutor.TutorProfileRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeoService {

    private final SeoSettingsRepository seoRepo;
    private final TutorProfileRepository tutorRepo;

    public SeoService(SeoSettingsRepository seoRepo, TutorProfileRepository tutorRepo) {
        this.seoRepo = seoRepo;
        this.tutorRepo = tutorRepo;
    }

    @Transactional(readOnly = true)
    public SeoSettings getSettings() {
        return seoRepo.findAll().stream().findFirst()
                .orElseGet(() -> {
                    SeoSettings s = new SeoSettings();
                    s.setSiteTitle("OkuTutor — найдите репетитора онлайн");
                    s.setSiteDescription("OkuTutor — образовательная платформа: найдите репетитора");
                    s.setSiteKeywords("репетитор, тьютор");
                    s.setCanonicalBaseUrl("https://okututor.com");
                    s.setRobotsTxt("User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://okututor.com/sitemap.xml");
                    s.setOgImageUrl("https://okututor.com/og-cover.png");
                    s.setOgLocale("ru_RU");
                    return s;
                });
    }

    @Transactional
    @CacheEvict(value = {"seoSitemap"}, allEntries = true)
    public SeoSettings update(SeoSettings incoming) {
        SeoSettings current = getSettings();
        if (incoming.getSiteTitle() != null) current.setSiteTitle(incoming.getSiteTitle());
        if (incoming.getSiteDescription() != null) current.setSiteDescription(incoming.getSiteDescription());
        if (incoming.getSiteKeywords() != null) current.setSiteKeywords(incoming.getSiteKeywords());
        if (incoming.getCanonicalBaseUrl() != null) current.setCanonicalBaseUrl(incoming.getCanonicalBaseUrl());
        if (incoming.getRobotsTxt() != null) current.setRobotsTxt(incoming.getRobotsTxt());
        if (incoming.getOgImageUrl() != null) current.setOgImageUrl(incoming.getOgImageUrl());
        if (incoming.getOgLocale() != null) current.setOgLocale(incoming.getOgLocale());
        if (incoming.getStructuredData() != null) current.setStructuredData(incoming.getStructuredData());
        return seoRepo.save(current);
    }

    @Cacheable(value = "seoSitemap")
    @Transactional(readOnly = true)
    public String generateSitemapXml() {
        SeoSettings seo = getSettings();
        String base = seo.getCanonicalBaseUrl().replaceAll("/$", "");
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        // static pages
        List<String> staticPaths = List.of("/", "/search", "/tutors");
        for (String p : staticPaths) {
            sb.append("  <url><loc>").append(base).append(p).append("</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n");
        }
        // published tutors
        var tutors = tutorRepo.findPublishedForSitemap();
        for (var t : tutors) {
            String loc = base + "/tutor/" + t.getSlug();
            String lastmod = t.getUpdatedAt() != null ? t.getUpdatedAt().toString().substring(0,10) : Instant.now().toString().substring(0,10);
            sb.append("  <url><loc>").append(escapeXml(loc)).append("</loc><lastmod>").append(lastmod).append("</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n");
        }
        sb.append("</urlset>");
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String getRobotsTxt() {
        return getSettings().getRobotsTxt();
    }

    private String escapeXml(String s) {
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
    }
}
