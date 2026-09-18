package com.okututor.backend.tutor.dto;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

public record TutorPageCacheDto(
        List<TutorProfileResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last,
        int numberOfElements
) {
    public static TutorPageCacheDto from(Page<TutorProfileResponse> page) {
        return new TutorPageCacheDto(
                List.copyOf(page.getContent()),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast(),
                page.getNumberOfElements()
        );
    }

    public Page<TutorProfileResponse> toPage() {
        return new PageImpl<>(content, PageRequest.of(page, size), totalElements);
    }
}
