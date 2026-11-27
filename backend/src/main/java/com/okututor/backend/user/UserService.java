package com.okututor.backend.user;

import com.okututor.backend.auth.RefreshTokenService;
import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.security.JwtAuthenticationFilter;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.user.dto.PublicUserResponse;
import com.okututor.backend.user.dto.UpdateProfileRequest;
import com.okututor.backend.user.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final TutorProfileRepository tutorProfileRepository;
    private final RefreshTokenService refreshTokenService;
    private final JwtAuthenticationFilter jwtAuthFilter;

    public UserService(UserRepository userRepository,
                       UserMapper userMapper,
                       TutorProfileRepository tutorProfileRepository,
                       RefreshTokenService refreshTokenService,
                       JwtAuthenticationFilter jwtAuthFilter) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.tutorProfileRepository = tutorProfileRepository;
        this.refreshTokenService = refreshTokenService;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Transactional
    public void deleteAccount(User user) {
        if (user == null) return;
        // 1. Archive tutor profile if exists
        tutorProfileRepository.findByUserId(user.getId()).ifPresent(profile -> {
            profile.archive();
            tutorProfileRepository.save(profile);
        });
        // 2. Revoke all refresh tokens & auth cache
        refreshTokenService.revokeAllForUser(user.getId());
        jwtAuthFilter.invalidate(user.getId());
        // 3. Anonymize user PII (Право на удаление персональных данных / GDPR)
        user.setFirstName("Удаленный");
        user.setLastName("Пользователь");
        user.setBio(null);
        user.setPhone(null);
        user.setLocation(null);
        user.setAvatarUrl(null);
        user.setPasswordHash(null);
        user.setBlocked(true);
        user.setEmail("deleted_" + user.getId() + "@okututor.local");
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User requireById(java.util.UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    @Transactional
    public UserResponse updateProfile(User current, UpdateProfileRequest request) {
        if (request.fullName() != null && !request.fullName().isBlank()) {
            String[] names = User.splitFullName(request.fullName());
            current.setFirstName(names[0]);
            current.setLastName(names[1]);
        } else {
            if (request.firstName() != null) {
                current.setFirstName(request.firstName().isBlank() ? null : request.firstName().trim());
            }
            if (request.lastName() != null) {
                current.setLastName(request.lastName().isBlank() ? null : request.lastName().trim());
            }
        }
        if (request.bio() != null) {
            current.setBio(request.bio());
        }
        if (request.phone() != null) {
            current.setPhone(request.phone());
        }
        if (request.location() != null) {
            current.setLocation(request.location());
        }
        if (request.experience_years() != null) {
            current.setExperienceYears(request.experience_years());
        }
        if (request.education() != null) {
            current.setEducation(request.education());
        }
        if (request.timezone() != null && !request.timezone().isBlank()) {
            try {
                java.time.ZoneId.of(request.timezone().trim());
                current.setTimezone(request.timezone().trim());
            } catch (Exception e) {
                throw ApiException.validation(com.okututor.backend.common.error.ErrorCodes.INVALID_TIMEZONE, "Invalid timezone: " + request.timezone());
            }
        }
        return userMapper.toResponse(userRepository.save(current));
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> tutors(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<User> result = (q == null || q.isBlank())
                ? userRepository.findByRoleOrderByCreatedAtDesc(Role.TUTOR, pageable)
                : userRepository.searchTutors(q.trim().toLowerCase(), pageable);
        return result.map(userMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<PublicUserResponse> tutorsPublic(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<User> result = (q == null || q.isBlank())
                ? userRepository.findByRoleOrderByCreatedAtDesc(Role.TUTOR, pageable)
                : userRepository.searchTutors(q.trim().toLowerCase(), pageable);
        return result.map(userMapper::toPublicResponse);
    }

    @Transactional(readOnly = true)
    public PublicUserResponse toPublic(User user) {
        return userMapper.toPublicResponse(user);
    }
}
