package com.okututor.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.okututor.backend.auth.RefreshTokenService;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.JwtAuthenticationFilter;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.user.dto.UpdateProfileRequest;
import com.okututor.backend.user.dto.UserResponse;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.verify;

class UserServiceTest {

    private UserRepository userRepository;
    private UserMapper userMapper;
    private TutorProfileRepository tutorProfileRepository;
    private RefreshTokenService refreshTokenService;
    private JwtAuthenticationFilter jwtAuthFilter;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userMapper = new UserMapper();
        tutorProfileRepository = mock(TutorProfileRepository.class);
        refreshTokenService = mock(RefreshTokenService.class);
        jwtAuthFilter = mock(JwtAuthenticationFilter.class);
        userService = new UserService(userRepository, userMapper, tutorProfileRepository, refreshTokenService, jwtAuthFilter);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void updateProfileSavesValidTimezone() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("tz@example.com");
        user.setRole(Role.STUDENT);

        UpdateProfileRequest request = new UpdateProfileRequest(
                "Jane Doe", null, null, "Bio", null, "Bishkek", 2, "Higher", "Asia/Bishkek"
        );

        UserResponse response = userService.updateProfile(user, request);

        assertThat(user.getTimezone()).isEqualTo("Asia/Bishkek");
        assertThat(response.timezone()).isEqualTo("Asia/Bishkek");
    }

    @Test
    void updateProfileRejectsInvalidTimezone() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("tz@example.com");
        user.setRole(Role.STUDENT);

        UpdateProfileRequest request = new UpdateProfileRequest(
                null, null, null, null, null, null, null, null, "Invalid/TimeZone_ABC"
        );

        assertThatThrownBy(() -> userService.updateProfile(user, request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Invalid timezone");
    }

    @Test
    void deleteAccountAnonymizesUserAndRevokesTokens() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("user@example.com");
        user.setFirstName("Ivan");
        user.setLastName("Petrov");
        user.setBio("Original bio");
        user.setPhone("+996555123456");
        user.setPasswordHash("secretHash");
        user.setBlocked(false);

        TutorProfile profile = new TutorProfile();
        profile.setId(UUID.randomUUID());
        profile.setStatus(TutorProfileStatus.PUBLISHED);
        when(tutorProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        userService.deleteAccount(user);

        assertThat(user.getFirstName()).isEqualTo("Удаленный");
        assertThat(user.getLastName()).isEqualTo("Пользователь");
        assertThat(user.getBio()).isNull();
        assertThat(user.getPhone()).isNull();
        assertThat(user.getPasswordHash()).isNull();
        assertThat(user.isBlocked()).isTrue();
        assertThat(user.getEmail()).isEqualTo("deleted_" + userId + "@okututor.local");

        assertThat(profile.getStatus()).isEqualTo(TutorProfileStatus.ARCHIVED);
        verify(refreshTokenService).revokeAllForUser(userId);
        verify(jwtAuthFilter).invalidate(userId);
    }
}

