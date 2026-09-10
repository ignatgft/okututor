package com.okututor.backend.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Прокидывает идентификатор запроса (correlation ID) для трассировки логов и
 * ответов об ошибках. Значение берётся из заголовка {@code X-Request-Id} (если
 * передан реверс-прокси/фронтом) либо генерируется. Кладётся в MDC {requestId}
 * на время обработки запроса; MDC персистится в дочерние потоки и подхватывается
 * лог-паттерном {@code %X{requestId:-}} (см. logback-spring.xml).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    public static final String MDC_KEY = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = request.getHeader(HEADER);
        if (!isValidRequestId(requestId)) {
            // невалидный/чужой id игнорируем: генерируем свой (защита от
            // лог-инъекций и неограниченной cardinality во внешних системах)
            requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }
        MDC.put(MDC_KEY, requestId);
        request.setAttribute(MDC_KEY, requestId);
        response.addHeader(HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    /** принимаем только [0-9a-zA-Z-]{8,64} — без пробелов/спецсимволов. */
    private boolean isValidRequestId(String id) {
        if (id == null || id.isBlank() || id.length() < 8 || id.length() > 64) {
            return false;
        }
        return id.chars().allMatch(c -> Character.isLetterOrDigit(c) || c == '-');
    }
}
