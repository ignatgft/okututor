package com.okututor.backend.security;

import com.okututor.backend.auth.dto.AuthTokensResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/oauth")
public class OAuthExchangeController {

    public record ExchangeRequest(String code) {}
    public record ExchangeResponse(String access_token, String refresh_token) {}

    private final OAuthCodeStore codeStore;

    public OAuthExchangeController(OAuthCodeStore codeStore) {
        this.codeStore = codeStore;
    }

    @PostMapping("/exchange")
    public ResponseEntity<AuthTokensResponse> exchange(@RequestBody ExchangeRequest req) {
        AuthTokensResponse tokens = codeStore.consume(req.code());
        return ResponseEntity.ok(tokens);
    }
}
