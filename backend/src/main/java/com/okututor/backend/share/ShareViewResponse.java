package com.okututor.backend.share;

import com.okututor.backend.tutor.dto.TutorProfileResponse;

public record ShareViewResponse(
        ShareResponse share,
        TutorProfileResponse resume
) {}