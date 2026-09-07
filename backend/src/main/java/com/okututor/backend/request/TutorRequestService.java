package com.okututor.backend.request;

import com.okututor.backend.common.error.ApiException;
import com.okututor.backend.request.dto.TutorRequestCreateRequest;
import com.okututor.backend.request.dto.TutorRequestResponse;
import com.okututor.backend.tutor.TutorProfile;
import com.okututor.backend.tutor.TutorProfileRepository;
import com.okututor.backend.tutor.TutorProfileStatus;
import com.okututor.backend.user.User;
import com.okututor.backend.user.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TutorRequestService {

    private final TutorRequestRepository requestRepository;
    private final TutorProfileRepository profileRepository;
    private final UserRepository userRepository;

    public TutorRequestService(TutorRequestRepository requestRepository, TutorProfileRepository profileRepository, UserRepository userRepository) {
        this.requestRepository = requestRepository;
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TutorRequestResponse create(TutorRequestCreateRequest req, UUID studentUserId) {
        TutorProfile profile = profileRepository.findById(req.tutorProfileId()).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (profile.getStatus() != TutorProfileStatus.PUBLISHED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (req.studentContact() == null || req.studentContact().isBlank()) throw ApiException.validation("student_contact is required");
        if (req.studentName() == null || req.studentName().isBlank()) throw ApiException.validation("student_name is required");
        // prevent self-request
        if (studentUserId != null && profile.getUser().getId().equals(studentUserId)) {
            throw ApiException.validation("Cannot contact yourself");
        }

        TutorRequest r = new TutorRequest();
        r.setTutorProfile(profile);
        r.setTutorUser(profile.getUser());
        if (studentUserId != null) {
            User student = userRepository.findById(studentUserId).orElse(null);
            r.setStudentUser(student);
        }
        r.setStudentName(req.studentName().trim());
        r.setStudentContact(req.studentContact().trim());
        r.setMessage(req.message());
        r.setStatus(TutorRequest.Status.NEW);
        requestRepository.save(r);
        return toResponse(r);
    }

    @Transactional(readOnly = true)
    public Page<TutorRequestResponse> forTutor(UUID tutorUserId, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1),100));
        return requestRepository.findByTutorUserIdOrderByCreatedAtDesc(tutorUserId, pr).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<TutorRequestResponse> forStudent(UUID studentUserId, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1),100));
        return requestRepository.findByStudentUserIdOrderByCreatedAtDesc(studentUserId, pr).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<TutorRequestResponse> forProfile(UUID profileId, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1),100));
        return requestRepository.findByTutorProfileIdOrderByCreatedAtDesc(profileId, pr).map(this::toResponse);
    }

    @Transactional
    public TutorRequestResponse markViewed(UUID requestId, UUID tutorUserId) {
        TutorRequest r = requestRepository.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found"));
        if (!r.getTutorUser().getId().equals(tutorUserId)) throw ApiException.forbidden("Not your request");
        if (r.getStatus() == TutorRequest.Status.NEW) {
            r.setStatus(TutorRequest.Status.VIEWED);
            requestRepository.save(r);
        }
        return toResponse(r);
    }

    @Transactional
    public TutorRequestResponse updateStatus(UUID requestId, UUID tutorUserId, String status) {
        TutorRequest r = requestRepository.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found"));
        if (!r.getTutorUser().getId().equals(tutorUserId)) throw ApiException.forbidden("Not your request");
        TutorRequest.Status s;
        try { s = TutorRequest.Status.valueOf(status.toUpperCase()); } catch (Exception e) { throw ApiException.validation("Unknown status: " + status); }
        r.setStatus(s);
        requestRepository.save(r);
        return toResponse(r);
    }

    @Transactional(readOnly = true)
    public Page<TutorRequestResponse> adminList(int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1),100));
        return requestRepository.findAll(pr).map(this::toResponse);
    }

    private TutorRequestResponse toResponse(TutorRequest r) {
        return new TutorRequestResponse(
                r.getId(),
                r.getTutorProfile().getId(),
                r.getTutorProfile().getSlug(),
                r.getTutorUser().getId(),
                r.getStudentUser() == null ? null : r.getStudentUser().getId(),
                r.getStudentName(),
                r.getStudentContact(),
                r.getMessage(),
                r.getStatus().name(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
