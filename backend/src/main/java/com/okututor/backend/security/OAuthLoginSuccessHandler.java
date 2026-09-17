package com.okututor.backend.security;

import com.okututor.backend.auth.AuthService;
import com.okututor.backend.auth.dto.AuthTokensResponse;

import com.okututor.backend.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * после успешного входа через Google редиректит на
 * {FRONTEND_URL}/oauth/callback?code=.. (one-time code, TTL 2m).
 * Фронт обменивает code на токены через POST /api/v1/auth/oauth/exchange.
 * Легаси query access_token/refresh_token убран — утечка через Referer/логи (C2).
 */
@Component
public class OAuthLoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuthLoginSuccessHandler.class);

    private final AuthService authService;
    private final GoogleProvisioner provisioner;
    private final OAuthCodeStore codeStore;
    private final com.okututor.backend.common.config.AppProperties properties;
    private final com.okututor.backend.observability.ObservabilityMetrics metrics;

    public OAuthLoginSuccessHandler(AuthService authService,
                                     GoogleProvisioner provisioner,
                                     OAuthCodeStore codeStore,
                                     com.okututor.backend.common.config.AppProperties properties,
                                     com.okututor.backend.observability.ObservabilityMetrics metrics) {
        this.authService = authService;
        this.provisioner = provisioner;
        this.codeStore = codeStore;
        this.properties = properties;
        this.metrics = metrics;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                         HttpServletResponse response,
                                         Authentication authentication) throws IOException {
        try {
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            // эскалация ролей через ?role= запрещена: OAuth всегда выдаёт STUDENT
            User user = provisioner.provision(token.getPrincipal());

            AuthTokensResponse tokens = authService.buildTokenPair(user);
            String code = codeStore.create(tokens);
            String redirectUrl = UriComponentsBuilder.fromHttpUrl(properties.getFrontendUrl())
                    .path("/oauth/callback")
                    .queryParam("code", code)
                    .build()
                    .encode()
                    .toUriString();
            try { metrics.oauthSuccess(); } catch (Exception ignored) {}
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        } catch (Exception ex) {
            log.error("OAuth login failed", ex);
            try { metrics.oauthFailure(); } catch (Exception ignored) {}
            redirectError(response);
        }
    }

    private void redirectError(HttpServletResponse response) throws IOException {
        String url = UriComponentsBuilder.fromHttpUrl(properties.getFrontendUrl())
                .path("/oauth/callback")
                .queryParam("error", "oauth_failed")
                .build()
                .toUriString();
        response.sendRedirect(url);
    }

}
