package com.okututor.backend.common.web;

import com.okututor.backend.common.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
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

        if (!isTrustedIp(remoteAddr, trusted)) {
            return remoteAddr;
        }

        // Proxy chain handling: split by comma and traverse from right to left
        // Standard X-Forwarded-For: client, proxy1, proxy2
        // where remoteAddr is direct peer proxy.
        String[] parts = forwarded.split(",");
        List<String> ips = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                if (!isValidIp(trimmed)) {
                    // Malformed header / non-IP value -> ignore XFF completely
                    return remoteAddr;
                }
                ips.add(trimmed);
            }
        }

        if (ips.isEmpty()) {
            return remoteAddr;
        }

        // Walk backwards from rightmost proxy to find first untrusted IP (the real client)
        for (int i = ips.size() - 1; i >= 0; i--) {
            String ip = ips.get(i);
            if (!isTrustedIp(ip, trusted)) {
                return ip;
            }
        }

        // If all proxies in the chain are in trusted subnets, the leftmost is the client
        return ips.get(0);
    }

    private boolean isTrustedIp(String ip, List<String> trustedList) {
        if (ip == null || ip.isBlank()) return false;
        for (String trustedEntry : trustedList) {
            String entry = trustedEntry.trim();
            if (entry.isEmpty()) continue;
            try {
                IpAddressMatcher matcher = new IpAddressMatcher(entry);
                if (matcher.matches(ip)) {
                    return true;
                }
            } catch (IllegalArgumentException e) {
                // If entry has invalid format, fallback to exact string equals
                if (entry.equalsIgnoreCase(ip)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static final java.util.regex.Pattern IPV4_PATTERN =
            java.util.regex.Pattern.compile("^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.){3}(25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)$");
    private static final java.util.regex.Pattern IPV6_PATTERN =
            java.util.regex.Pattern.compile("^[0-9a-fA-F:.]+$");

    private boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || ip.contains(" ") || ip.length() > 45) {
            return false;
        }
        if (IPV4_PATTERN.matcher(ip).matches()) {
            return true;
        }
        if (ip.contains(":") && IPV6_PATTERN.matcher(ip).matches()) {
            try {
                return InetAddress.getByName(ip) instanceof java.net.Inet6Address;
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }
}
