package com.okututor.backend.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.okututor.backend.common.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.junit.jupiter.api.Test;

class ClientIpResolverTest {

    @Test
    void resolve_noForwardedHeader_returnsRemoteAddr() {
        AppProperties props = new AppProperties();
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("192.168.1.50");
        when(req.getHeader("X-Forwarded-For")).thenReturn(null);

        assertThat(resolver.resolve(req)).isEqualTo("192.168.1.50");
    }

    @Test
    void resolve_untrustedProxy_ignoresXForwardedFor() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("10.0.0.1", "127.0.0.1"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("192.168.1.50");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195");

        // RemoteAddr is not in trustedProxies -> must ignore X-Forwarded-For to prevent spoofing
        assertThat(resolver.resolve(req)).isEqualTo("192.168.1.50");
    }

    @Test
    void resolve_trustedProxy_returnsClientIp() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("10.0.0.1", "127.0.0.1"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195, 10.0.0.1");

        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.195");
    }

    @Test
    void resolve_emptyTrustedProxies_ignoresXForwardedFor() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of());
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195");

        assertThat(resolver.resolve(req)).isEqualTo("10.0.0.1");
    }

    @Test
    void resolve_malformedForwardedHeader_fallsBackToRemoteAddr() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("10.0.0.1"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");
        when(req.getHeader("X-Forwarded-For")).thenReturn("invalid ip header with spaces");

        assertThat(resolver.resolve(req)).isEqualTo("10.0.0.1");
    }

    @Test
    void resolve_trustedProxyPrefixNotMatched_ignoresXForwardedFor() {
        AppProperties props = new AppProperties();
        // 10.0.0.1 trusted should NOT match 10.0.0.10 via prefix
        props.setTrustedProxies(List.of("10.0.0.1"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.0.10");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195");

        assertThat(resolver.resolve(req)).isEqualTo("10.0.0.10");
    }

    @Test
    void resolve_cidrSubnetTrusted_returnsClientIp() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("10.0.0.0/24"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.0.42");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195");

        assertThat(resolver.resolve(req)).isEqualTo("203.0.113.195");
    }

    @Test
    void resolve_cidrSubnetUntrusted_ignoresXForwardedFor() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("10.0.0.0/24"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.1.42");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195");

        assertThat(resolver.resolve(req)).isEqualTo("10.0.1.42");
    }

    @Test
    void resolve_ipv6Addresses_handledCorrectly() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("::1", "fe80::/10"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("::1");
        when(req.getHeader("X-Forwarded-For")).thenReturn("2001:db8::1");

        assertThat(resolver.resolve(req)).isEqualTo("2001:db8::1");
    }

    @Test
    void resolve_multipleProxiesInChain_returnsFirstUntrustedClientIp() {
        AppProperties props = new AppProperties();
        props.setTrustedProxies(List.of("10.0.0.1", "10.0.0.2"));
        ClientIpResolver resolver = new ClientIpResolver(props);

        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");
        // Chain: real client 198.51.100.22 -> trusted proxy 10.0.0.2 -> direct peer 10.0.0.1
        when(req.getHeader("X-Forwarded-For")).thenReturn("198.51.100.22, 10.0.0.2");

        assertThat(resolver.resolve(req)).isEqualTo("198.51.100.22");
    }
}
