package com.okututor.backend.tutor.dto;

import java.util.List;

public record TutorSliceResponse<T>(
        List<T> content,
        int page,
        int size,
        boolean hasNext,
        String nextCursor,
        boolean first,
        boolean last
) {
    public static <T> TutorSliceResponse<T> of(List<T> content, int page, int size, boolean hasNext, String nextCursor) {
        return new TutorSliceResponse<>(content, page, size, hasNext, nextCursor, page == 0, !hasNext);
    }
}
