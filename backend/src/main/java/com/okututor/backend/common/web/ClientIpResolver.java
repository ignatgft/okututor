package com.okututor.backend.common.web;

import com.okututor.backend.common.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {

    private final AppProperties appProperties;

    public ClientIpResolver(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) {
            return remoteAddr;
        }
        // Only trust XFF if remoteAddr is a trusted proxy (prevents client spoofing)
        List<String> trusted = appProperties.getTrustedProxies();
        if (trusted == null) trusted = List.of();
        // filter blank entries (empty env var yields [""])
        trusted = trusted.stream().filter(t -> t != null && !t.isBlank()).toList();
        if (trusted.isEmpty()) {
            // no trusted proxies configured → do not trust client-provided XFF
            return remoteAddr;
        }
        boolean isTrusted = trusted.stream().anyMatch(t -> t.equals(remoteAddr) || remoteAddr.startsWith(t.replace("*", "")));
        if (!isTrusted) {
            return remoteAddr;
        }
        int comma = forwarded.indexOf(',');
        String first = (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        // basic validation: must look like IP, otherwise fallback to remoteAddr
        if (first.isEmpty() || first.contains(" ") || first.length() > 45) {
            return remoteAddr;
        }
        return first;
    }
}
