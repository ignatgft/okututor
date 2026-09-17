package com.okututor.backend.seo;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/seo")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminSeoController {

    private final SeoService seoService;

    public AdminSeoController(SeoService seoService) {
        this.seoService = seoService;
    }

    @GetMapping("/settings")
    public SeoSettings get(@AuthenticationPrincipal UserPrincipal principal) {
        requireAdmin(principal);
        return seoService.getSettings();
    }

    @PutMapping("/settings")
    public SeoSettings update(@AuthenticationPrincipal UserPrincipal principal,
                              @RequestBody SeoSettings incoming) {
        requireAdmin(principal);
        if (incoming == null) throw ApiException.validation("body is required");
        return seoService.update(incoming);
    }

    private void requireAdmin(UserPrincipal p) {
        if (p == null) throw ApiException.unauthorized("Authentication required");
        if (!p.isAdminLike()) throw ApiException.forbidden("Admin required");
    }
}
