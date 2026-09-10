package com.okututor.backend.tutor;

import com.okututor.backend.level.Level;
import com.okututor.backend.location.City;
import com.okututor.backend.location.District;
import com.okututor.backend.subject.Subject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ReferenceDataController {

    private final ReferenceDataService service;

    public ReferenceDataController(ReferenceDataService service) { this.service = service; }

    @GetMapping("/subjects")
    public List<Map<String, Object>> subjects() {
        return service.subjects().stream().map(this::subjectMap).collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/levels")
    public List<Map<String, Object>> levels() {
        return service.levels().stream().map(l -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", l.getId().toString());
            m.put("slug", l.getSlug());
            m.put("name_ru", l.getNameRu());
            m.put("tier", l.getTier());
            m.put("sort_order", l.getSortOrder());
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/cities")
    public List<Map<String, Object>> cities() {
        return service.cities().stream().map(c -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", c.getId().toString());
            m.put("slug", c.getSlug());
            m.put("name_ru", c.getNameRu());
            m.put("name_kg", c.getNameKg() == null ? "" : c.getNameKg());
            m.put("sort_order", c.getSortOrder());
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/cities/{cityId}/districts")
    public List<Map<String, Object>> districts(@PathVariable UUID cityId) {
        return service.districts(cityId).stream().map(d -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", d.getId().toString());
            m.put("slug", d.getSlug());
            m.put("name_ru", d.getNameRu());
            m.put("city_id", d.getCity().getId().toString());
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    private Map<String, Object> subjectMap(Subject s) {
        return Map.of(
                "id", s.getId().toString(),
                "slug", s.getSlug(),
                "name_ru", s.getNameRu(),
                "name_kg", s.getNameKg() == null ? "" : s.getNameKg(),
                "name_en", s.getNameEn() == null ? "" : s.getNameEn(),
                "sort_order", s.getSortOrder()
        );
    }
}
