package com.okututor.backend.legal;

import com.okututor.backend.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ConsentController {

    private final ConsentService consentService;
    private final ConsentRecordRepository consentRepository;

    public ConsentController(ConsentService consentService, ConsentRecordRepository consentRepository) {
        this.consentService = consentService;
        this.consentRepository = consentRepository;
    }

    @PostMapping("/consents/accept")
    public ConsentRecord accept(@AuthenticationPrincipal UserPrincipal principal,
                                @RequestBody Map<String, String> body,
                                HttpServletRequest request) {
        if (principal == null) throw com.okututor.backend.common.error.ApiException.unauthorized("Authentication required");
        String type = body.get("consentType");
        String docType = body.get("documentType");
        String version = body.get("version");
        String ip = request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");
        return consentService.accept(principal.id(), type, docType, version, ip, ua);
    }

    @PostMapping("/consents/revoke")
    public ConsentRecord revoke(@AuthenticationPrincipal UserPrincipal principal,
                                @RequestBody Map<String, String> body) {
        if (principal == null) throw com.okututor.backend.common.error.ApiException.unauthorized("Authentication required");
        return consentService.revoke(principal.id(), body.get("consentType"));
    }

    @GetMapping("/consents/me")
    public List<ConsentRecord> myConsents(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw com.okututor.backend.common.error.ApiException.unauthorized("Authentication required");
        return consentService.history(principal.id());
    }

    @GetMapping("/consents/requiring")
    public List<ConsentRecord> requiring(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw com.okututor.backend.common.error.ApiException.unauthorized("Authentication required");
        consentService.checkReconsentForUser(principal.id());
        return consentService.requiringReconsent(principal.id());
    }

    @GetMapping("/consents/history")
    public List<ConsentRecord> history(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw com.okututor.backend.common.error.ApiException.unauthorized("Authentication required");
        return consentRepository.findByUserId(principal.id(), org.springframework.data.domain.PageRequest.of(0, 100)).getContent();
    }
}
