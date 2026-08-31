import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { enrollmentsApi, studentsApi } from "../api/students.api";
import ConfirmModal from "../components/ui/ConfirmModal";
import { Badge, Spinner, ErrorState } from "../components/ui/Primitives";
import { Timeline } from "../components/ui/Timeline";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/Toast";
import { ENROLLMENT_STATUS } from "../constants/enums";
import { applicationStatusLabel } from "../utils/statusLabels";
import { buildApplicationTimeline } from "../utils/applicationTimeline";
import { getUserTimezone } from "../utils/timezone";
import "../styles/Dashboard.css";
import "../styles/overlay.css";

export default function PgStudentRequestDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const setPageTitle = usePageTitle();

  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [infoReply, setInfoReply] = useState("");
  const [infoSending, setInfoSending] = useState(false);

  useEffect(() => { setPageTitle(t("request_detail.title", "Application details")); }, [setPageTitle, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await enrollmentsApi.byId(id);
      if (response.ok) {
        setEnrollment(data);
      } else {
        setError(data?.message || data?.error || t("common.error", "Error"));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!enrollment) return;
    setCancelLoading(true);
    try {
      await studentsApi.cancelEnrollment(enrollment.id);
      toast.success(t("student_requests.cancel_success", "Request cancelled"));
      setEnrollment({ ...enrollment, status: ENROLLMENT_STATUS.CANCELLED });
      setShowCancel(false);
    } catch (e) {
      toast.error(e.message || t("errors.default", "Something went wrong."));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleProvideInfo = async (e) => {
    e.preventDefault();
    if (!infoReply.trim()) return;
    setInfoSending(true);
    try {
      await enrollmentsApi.provideInfo(enrollment.id, { message: infoReply });
      toast.success(t("needs_info.provided", "Answer sent"));
      setInfoReply("");
      load();
    } catch (err) {
      toast.error(err.message || t("errors.default", "Something went wrong."));
    } finally {
      setInfoSending(false);
    }
  };

  const status = enrollment?.status;
  const canCancel =
    status === ENROLLMENT_STATUS.PENDING ||
    status === ENROLLMENT_STATUS.NEEDS_INFO ||
    status === ENROLLMENT_STATUS.ACCEPTED;
  const isTerminal = status === ENROLLMENT_STATUS.COMPLETED || status === ENROLLMENT_STATUS.CANCELLED || status === ENROLLMENT_STATUS.REJECTED;
  const timeline = buildApplicationTimeline(status);

  return (
    <>
      <PageHeader
        title={t("request_detail.title")}
        actions={
          <>
            <Link to="/student/requests" className="btn-secondary">
              {t("request_detail.back_to_requests", "All requests")}
            </Link>
            {canCancel && (
              <button className="btn-danger" onClick={() => setShowCancel(true)}>
                {t("student_requests.cancel_title", "Cancel request")}
              </button>
            )}
          </>
        }
      />

      {loading ? (
        <Spinner label={t("common.loading", "Loading...")} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !enrollment ? (
        <ErrorState message={t("common.not_found", "Not found")} onRetry={load} />
      ) : (
        <div className="dashboard-section">
          <div className="booking-card">
            <div className="booking-info">
              <h3>{enrollment.course_title || enrollment.course?.title}</h3>
              <p>{enrollment.teacher_name || enrollment.course?.teacher_name}</p>
              {enrollment.created_at && (
                <p className="booking-time">{new Date(enrollment.created_at).toLocaleString()}</p>
              )}
              <p className="booking-meta">
                <Badge status={status}>{applicationStatusLabel(status, t)}</Badge>
              </p>
            </div>
            <div className="booking-actions">
              {(enrollment.course_id || enrollment.course?.id) && (
                <Link
                  to={`/courses/${enrollment.course_id || enrollment.course.id}`}
                  className="btn-secondary"
                >
                  {t("request_detail.course", "Course")}
                </Link>
              )}
            </div>
          </div>

          {enrollment.preferred_schedule && (
            <div className="detail-block">
              <h4>{t("request_detail.preferences", "Preferences")}</h4>
              <p>🕐 {enrollment.preferred_schedule} {t("common.in_timezone", "({{tz}})", { tz: getUserTimezone() })}</p>
            </div>
          )}

          {enrollment.message && (
            <div className="detail-block">
              <h4>{t("request_detail.comment", "Comment")}</h4>
              <p>«{enrollment.message}»</p>
            </div>
          )}

          <div className="detail-block">
            <h4>{t("request_detail.timeline", "Timeline")}</h4>
            <Timeline steps={timeline.map((s) => ({ id: s.key, title: t(s.titleKey), state: s.state }))} />
          </div>

          {status === ENROLLMENT_STATUS.SCHEDULE_PENDING && (
            <div className="detail-block highlight-block">
              <p>{t("request_detail.awaiting_confirmation", "Awaiting schedule confirmation")}</p>
              <button
                className="btn-secondary"
                onClick={() => toast.info(t("request_detail.schedule_in_progress", "The tutor is working on your schedule."))}
              >
                {t("request_detail.message_tutor", "Message the tutor")}
              </button>
            </div>
          )}

          {status === ENROLLMENT_STATUS.NEEDS_INFO && (
            <div className="detail-block highlight-block">
              <h4>{t("needs_info.provide_title", "Additional information")}</h4>
              <form className="modal-form" onSubmit={handleProvideInfo}>
                <textarea
                  rows={3}
                  value={infoReply}
                  onChange={(e) => setInfoReply(e.target.value)}
                  placeholder={t("needs_info.provide_placeholder", "Provide clarifying information...")}
                  required
                />
                <div className="modal-actions">
                  <button type="submit" className="btn-primary" disabled={infoSending}>
                    {infoSending ? t("common.loading", "Loading...") : t("needs_info.provide", "Reply to tutor")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isTerminal && status === ENROLLMENT_STATUS.COMPLETED && (
            <div className="detail-block highlight-block">
              <p>✅ {t("request_detail.lesson_completed", "Lessons completed in this course.")}</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={showCancel}
        title={t("student_requests.cancel_title", "Cancel request?")}
        message={t(
          "student_requests.cancel_message",
          "Your request to join \"{{course}}\" will be withdrawn.",
          { course: enrollment?.course_title || enrollment?.course?.title || "" }
        )}
        confirmLabel={t("common.cancel_request", "Cancel request")}
        loading={cancelLoading}
        onCancel={() => setShowCancel(false)}
        onConfirm={handleCancel}
      />
    </>
  );
}
