package com.okututor.backend.auth.dto;

import com.okututor.backend.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank String repeat_password,
        @NotBlank @Size(max = 200) String full_name,
        Role role
) {

    public Role roleOrDefault() {
        // FEATURE FREEZE: registration never creates privileged role. Admin is created only via
        // direct DB seed or PUT /admin/users/{id}/role by SUPER_ADMIN. Ignore client-supplied role.
        return Role.USER;
    }

    public String normalizedName() {
        return full_name == null ? null : full_name.trim().replaceAll("\\s+", " ");
    }

    public String normalizedEmail() {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
