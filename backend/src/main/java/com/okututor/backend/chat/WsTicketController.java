package com.okututor.backend.chat;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.UserPrincipal;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Выдача одноразовых WS-тикетов (см. {@link WsTicketService}).
 *
 * <p>Эндпоинт требует аутентификации (не входит в PUBLIC_POST/GET в
 * SecurityConfig, покрывается anyRequest().authenticated()).
 */
@RestController
@RequestMapping("/api/v1")
public class WsTicketController {

    private final WsTicketService ticketService;

    public WsTicketController(WsTicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping("/ws/ticket")
    public Map<String, String> issue(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.id() == null) {
            throw ApiException.unauthorized("Unauthorized");
        }
        return Map.of("ticket", ticketService.issue(principal.id()));
    }
}
