package com.okututor.backend.media;

import com.okututor.backend.security.UserPrincipal;
import com.okututor.backend.user.UserService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * обложка курса (#36): POST /api/v1/courses/{courseId}/cover.
 * Аватарные эндпоинты живут в UserController (PUT-совместимость с фронтом).
 */
@RestController
@RequestMapping("/api/v1")
public class MediaController {

    private final MediaService mediaService;
    private final UserService userService;

    public MediaController(MediaService mediaService, UserService userService) {
        this.mediaService = mediaService;
        this.userService = userService;
    }

    private static void requireAuth(UserPrincipal principal) {
        if (principal == null) {
            throw com.okututor.backend.common.error.ApiException.unauthorized("Authentication required");
        }
    }
}
