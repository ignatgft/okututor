package com.okututor.backend.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/**
 * Бизнес-метрики OkuTutor (низкая cardinality: только фиксированные enum-значения,
 * никаких userId/bookingId/lessonId в тегах).
 */
@Component
public class ObservabilityMetrics {

    private final MeterRegistry registry;

    public ObservabilityMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    // ---------------- applications ----------------

    public void applicationCreated() {
        counter("okututor_applications_created_total").increment();
    }

    public void applicationAccepted() {
        counter("okututor_applications_accepted_total").increment();
    }

    public void applicationRejected() {
        counter("okututor_applications_rejected_total").increment();
    }

    public void applicationCancelled() {
        counter("okututor_applications_cancelled_total").increment();
    }

    // ---------------- bookings ----------------

    public void bookingCreated() {
        counter("okututor_bookings_created_total").increment();
    }

    public void bookingConfirmed() {
        counter("okututor_bookings_confirmed_total").increment();
    }

    public void bookingCancelled() {
        counter("okututor_bookings_cancelled_total").increment();
    }

    public void bookingExpired() {
        counter("okututor_bookings_expired_total").increment();
    }

    public <T> T timedBookingCreate(java.util.function.Supplier<T> action) {
        return timer("okututor_booking_create_duration").record(action);
    }

    public <T> T timedBookingConfirm(java.util.function.Supplier<T> action) {
        return timer("okututor_booking_confirm_duration").record(action);
    }

    // ---------------- lessons ----------------

    public void lessonCreated() {
        counter("okututor_lessons_created_total").increment();
    }

    public void lessonStarted() {
        counter("okututor_lessons_started_total").increment();
    }

    public void lessonCompleted() {
        counter("okututor_lessons_completed_total").increment();
    }

    public void lessonCancelled() {
        counter("okututor_lessons_cancelled_total").increment();
    }

    public void lessonNoShow(String side) {
        Counter.builder("okututor_lessons_no_show_total").tag("side", side).register(registry).increment();
    }

    // ---------------- meetings / livekit ----------------

    public void meetingCreated() {
        counter("okututor_meetings_created_total").increment();
    }

    public void meetingStarted() {
        counter("okututor_meetings_started_total").increment();
    }

    public void meetingJoined() {
        counter("okututor_meetings_joined_total").increment();
    }

    public void meetingCompleted() {
        counter("okututor_meetings_completed_total").increment();
    }

    public void meetingFailed() {
        counter("okututor_meetings_failed_total").increment();
    }

    // ---------------- reviews ----------------

    public void reviewCreated() {
        counter("okututor_reviews_created_total").increment();
    }

    // ---------------- schedule ----------------

    public void scheduleGeneration(int requested, int generated, int conflicts, boolean doubleBookingPrevented) {
        counter("okututor_schedule_generation_total").increment();
        if (generated == 0) {
            counter("okututor_schedule_generation_failed_total").increment();
        }
        counter("okututor_lessons_generated_total").increment(generated);
        if (conflicts > 0) {
            counter("okututor_schedule_conflicts_total").increment(conflicts);
        }
        if (doubleBookingPrevented) {
            counter("okututor_double_booking_prevented_total").increment();
        }
    }

    public <T> T timedScheduleGeneration(java.util.function.Supplier<T> action) {
        return timer("okututor_schedule_generation_duration").record(action);
    }

    // ---------------- security ----------------

    public void authLoginSuccess() {
        counter("okututor_auth_login_success_total").increment();
    }

    public void authLoginFailed() {
        counter("okututor_auth_login_failed_total").increment();
    }

    public void authRefreshSuccess() {
        counter("okututor_auth_refresh_success_total").increment();
    }

    public void authRefreshFailed() {
        counter("okututor_auth_refresh_failed_total").increment();
    }

    public void securityEvent(String kind) {
        // kind: 401 | 403 | invalid_token | rate_limit
        Counter.builder("okututor_security_events_total").tag("kind", kind).register(registry).increment();
    }

    // ---------------- external services ----------------

    public void externalRequest(String service) {
        Counter.builder("okututor_external_request_total").tag("service", service).register(registry).increment();
    }

    public void externalRequestFailed(String service) {
        Counter.builder("okututor_external_request_failed_total").tag("service", service).register(registry).increment();
    }

    public void externalRequestDuration(String service, long millis) {
        Timer.builder("okututor_external_request_duration").tag("service", service)
                .register(registry).record(millis, TimeUnit.MILLISECONDS);
    }

    // ---------------- marketplace tutor ----------------

    public void tutorProfileCreated() {
        counter("okututor_tutor_profile_created_total").increment();
    }

    public void tutorProfilePublished() {
        counter("okututor_tutor_profile_published_total").increment();
    }

    public void tutorProfileView() {
        counter("okututor_tutor_profile_view_total").increment();
    }

    public void tutorSearch() {
        counter("okututor_tutor_search_total").increment();
    }

    public void tutorSearchNoResults() {
        counter("okututor_tutor_search_no_results_total").increment();
    }

    public void tutorRequestCreated() {
        counter("okututor_tutor_request_created_total").increment();
    }

    public void tutorSearchDuration(long millis) {
        Timer.builder("okututor_tutor_search_duration").register(registry).record(millis, TimeUnit.MILLISECONDS);
    }

    // ---------------- errors ----------------

    public void error(String type) {
        Counter.builder("okututor_errors_total").tag("type", type).register(registry).increment();
    }

    // ---------------- helpers ----------------

    private Counter counter(String name) {
        return Counter.builder(name).register(registry);
    }

    private Timer timer(String name) {
        return Timer.builder(name).register(registry);
    }
}
