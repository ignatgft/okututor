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
    private final com.okututor.backend.observability.ObservabilityMetrics metrics;

    public TutorRequestService(TutorRequestRepository requestRepository, TutorProfileRepository profileRepository, UserRepository userRepository, com.okututor.backend.observability.ObservabilityMetrics metrics) {
        this.requestRepository = requestRepository;
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.metrics = metrics;
    }

    @Transactional
    public TutorRequestResponse create(TutorRequestCreateRequest req, UUID studentUserId) {
        TutorProfile profile = profileRepository.findById(req.tutorProfileId()).orElseThrow(() -> ApiException.notFound("Tutor profile not found"));
        if (profile.getStatus() != TutorProfileStatus.PUBLISHED) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (profile.getUser() != null && profile.getUser().isBlocked()) {
            throw ApiException.notFound("Tutor profile not found");
        }
        if (req.studentContact() == null || req.studentContact().isBlank()) throw ApiException.validation("student_contact is required");
        if (req.studentName() == null || req.studentName().isBlank()) throw ApiException.validation("student_name is required");
        // blocked student cannot create requests (checked via authenticated principal)
        if (studentUserId != null) {
            User student = userRepository.findById(studentUserId).orElse(null);
            if (student != null && student.isBlocked()) {
                throw ApiException.forbidden("Blocked users cannot create requests");
            }
        }
        // prevent self-request
        if (studentUserId != null && profile.getUser().getId().equals(studentUserId)) {
            throw ApiException.validation("Cannot contact yourself");
        }
        // idempotency: if same authenticated student already has an active request to same profile, return existing (avoid 3 requests on rapid clicks)
        if (studentUserId != null) {
            var existing = requestRepository.findByTutorProfileIdOrderByCreatedAtDesc(req.tutorProfileId(), PageRequest.of(0, 5)).getContent().stream()
                    .filter(x -> x.getStudentUser() != null && x.getStudentUser().getId().equals(studentUserId))
                    .filter(x -> x.getStatus() == TutorRequest.Status.NEW || x.getStatus() == TutorRequest.Status.VIEWED || x.getStatus() == TutorRequest.Status.CONTACTED)
                    .findFirst();
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
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
        try { metrics.tutorRequestCreated(); } catch (Exception ignored) {}
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
    public TutorRequestResponse updateStatus(UUID requestId, UUID callerId, String status) {
        TutorRequest r = requestRepository.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found"));
        boolean isTutor = r.getTutorUser() != null && r.getTutorUser().getId().equals(callerId);
        boolean isStudent = r.getStudentUser() != null && r.getStudentUser().getId().equals(callerId);
        if (!isTutor && !isStudent) throw ApiException.forbidden("Not your request");
        TutorRequest.Status target;
        try { target = TutorRequest.Status.valueOf(status.toUpperCase()); } catch (Exception e) { throw ApiException.validation("Unknown status: " + status); }
        TutorRequest.Status current = r.getStatus();
        if (target == current) return toResponse(r);
        // Student may only close own request; tutor owns full lifecycle
        if (isStudent && !isTutor) {
            if (target != TutorRequest.Status.CLOSED) {
                throw ApiException.forbidden("Students can only close requests");
            }
            if (!isAllowedTransition(current, target)) {
                throw ApiException.conflict("Invalid status transition: " + current + " -> " + target);
            }
        } else {
            if (!isAllowedTransition(current, target)) {
                throw ApiException.conflict("Invalid status transition: " + current + " -> " + target);
            }
        }
        r.setStatus(target);
        requestRepository.save(r);
        return toResponse(r);
    }

    private boolean isAllowedTransition(TutorRequest.Status from, TutorRequest.Status to) {
        return switch (from) {
            case NEW -> to == TutorRequest.Status.VIEWED || to == TutorRequest.Status.CONTACTED || to == TutorRequest.Status.CLOSED;
            case VIEWED -> to == TutorRequest.Status.CONTACTED || to == TutorRequest.Status.CLOSED;
            case CONTACTED -> to == TutorRequest.Status.CLOSED;
            case CLOSED -> false;
        };
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
