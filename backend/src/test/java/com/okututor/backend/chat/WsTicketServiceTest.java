package com.okututor.backend.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WsTicketServiceTest {

    private WsTicketService service;

    @BeforeEach
    void setUp() {
        service = new WsTicketService();
    }

    @Test
    void issueAndConsumeSuccess() {
        UUID userId = UUID.randomUUID();
        String ticket = service.issue(userId);

        assertThat(ticket).isNotBlank().hasSize(64);
        UUID consumed = service.consume(ticket);
        assertThat(consumed).isEqualTo(userId);
    }

    @Test
    void singleUseOnly() {
        UUID userId = UUID.randomUUID();
        String ticket = service.issue(userId);

        UUID first = service.consume(ticket);
        assertThat(first).isEqualTo(userId);

        UUID second = service.consume(ticket);
        assertThat(second).isNull();
    }

    @Test
    void consumeInvalidTicketReturnsNull() {
        assertThat(service.consume(null)).isNull();
        assertThat(service.consume("   ")).isNull();
        assertThat(service.consume("unknown-ticket")).isNull();
    }
}
