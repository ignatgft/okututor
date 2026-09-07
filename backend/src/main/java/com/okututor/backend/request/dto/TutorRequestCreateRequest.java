package com.okututor.backend.request.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record TutorRequestCreateRequest(
        @NotNull UUID tutorProfileId,
        @NotBlank @Size(max = 200) String studentName,
        @NotBlank @Size(max = 200) String studentContact,
        @Size(max = 1000) String message
) {}
