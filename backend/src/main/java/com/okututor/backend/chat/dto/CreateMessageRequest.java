package com.okututor.backend.chat.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMessageRequest(
        @JsonAlias({"body", "message"})
        @NotBlank(message = "text is required")
        @Size(max = 2000, message = "text must be <= 2000 characters")
        String text
) {
    // support alternative field name "body" from frontend
    public String effectiveText() {
        return text != null ? text.trim() : "";
    }
}
