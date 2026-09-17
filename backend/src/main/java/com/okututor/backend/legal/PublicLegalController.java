package com.okututor.backend.legal;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/legal")
public class PublicLegalController {

    private final LegalService legalService;

    public PublicLegalController(LegalService legalService) {
        this.legalService = legalService;
    }

    @GetMapping("/{type}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPublished(@PathVariable String type,
                                          @RequestParam(required = false, defaultValue = "ru") String lang) {
        try {
            var v = legalService.getPublished(type, lang);
            return ResponseEntity.ok(Map.of(
                    "type", v.getDocument().getType(),
                    "version", v.getVersion(),
                    "title", v.getTitle(),
                    "content", v.getContent(),
                    "language", v.getLanguage(),
                    "effectiveAt", v.getEffectiveAt() != null ? v.getEffectiveAt().toString() : "",
                    "updatedAt", v.getUpdatedAt().toString(),
                    "requiresReconsent", v.isRequiresReconsent()
            ));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Convenience aliases for spec: /terms, /privacy, /cookies, /personal-data
    @GetMapping("/terms")
    public ResponseEntity<?> terms(@RequestParam(defaultValue = "ru") String lang) {
        return getPublished("TERMS", lang);
    }

    @GetMapping("/privacy")
    public ResponseEntity<?> privacy(@RequestParam(defaultValue = "ru") String lang) {
        return getPublished("PRIVACY", lang);
    }

    @GetMapping("/cookies")
    public ResponseEntity<?> cookies(@RequestParam(defaultValue = "ru") String lang) {
        return getPublished("COOKIE", lang);
    }

    @GetMapping("/personal-data")
    public ResponseEntity<?> personalData(@RequestParam(defaultValue = "ru") String lang) {
        return getPublished("PERSONAL_DATA", lang);
    }
}
