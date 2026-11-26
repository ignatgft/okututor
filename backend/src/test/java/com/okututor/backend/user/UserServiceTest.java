package com.okututor.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.user.dto.UpdateProfileRequest;
import com.okututor.backend.user.dto.UserResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UserServiceTest {

    private UserRepository userRepository;
    private UserMapper userMapper;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userMapper = new UserMapper();
        userService = new UserService(userRepository, userMapper);
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
}

