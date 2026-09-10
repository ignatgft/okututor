// migrated to TSX — minimal strict types (controlled)
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../components/pageTitleContext";
import { adminApi } from "../api/admin.api";
import ConfirmModal from "../components/ui/ConfirmModal";
import ReasonModal from "../components/ui/ReasonModal";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";
import { TUTOR_STATUS, RESUME_STATUS } from "../constants/enums";
import "../styles/Admin.css";

function ApplicationDrawer({ application, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const Field = ({ label, value }) => (
    <div className="admin-app-field">
      <span className="admin-app-label">{label}</span>
      <span className="admin-app-value">{value || "—"}</span>
    </div>
  );

  return (
    <div className="admin-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={t("admin.application_detail", "Application details")}>
        <div className="admin-drawer-header">
          <h2>{t("admin.application_detail", "Application details")}</h2>
          <button type="button" className="admin-drawer-close" onClick={onClose} aria-label={t("common.close", "Close")}>
            ✕
          </button>
        </div>

        <div className="admin-drawer-body">
          <Field label={t("admin.name", "Name")} value={(application as Record<string,unknown>)["full_name"] as string || ((application as Record<string,unknown>)["user"] as Record<string,unknown>)?.["full_name"] as string || [ (application as Record<string,unknown>)["firstName"] as string, (application as Record<string,unknown>)["lastName"] as string].filter(Boolean).join(" ") || (application as Record<string,unknown>)["slug"] as string} />
          <Field label={t("admin.email", "Email")} value={(application as Record<string,unknown>)["email"] as string || ((application as Record<string,unknown>)["user"] as Record<string,unknown>)?.["email"] as string} />
          <Field label={t("admin.phone", "Phone")} value={(application as Record<string,unknown>)["phone"] as string} />
          <Field label={t("course.subject", "Subject")} value={Array.isArray((application as Record<string,unknown>)["subjects"]) ? ((application as Record<string,unknown>)["subjects"] as unknown[]).map((s) => typeof s === "string" ? s : (s as Record<string,unknown>)["nameRu"] as string || (s as Record<string,unknown>)["slug"] as string).join(", ") : (application as Record<string,unknown>)["subjects"] as string} />
          <Field label={t("become_tutor.step_languages", "Languages")} value={Array.isArray((application as Record<string,unknown>)["languages"]) ? ((application as Record<string,unknown>)["languages"] as unknown[]).join(", ") : (application as Record<string,unknown>)["languages"] as string} />
          <Field label={t("admin.location", "Location")} value={(application as Record<string,unknown>)["location"] as string || ((application as Record<string,unknown>)["city"] as Record<string,unknown>)?.["nameRu"] as string} />
          <Field label={t("cr_course.experience_label", "Years of experience")} value={(application as Record<string,unknown>)["experience_years"] as string} />
          <Field label={t("become_tutor.experience_desc", "Describe your teaching experience")} value={(application as Record<string,unknown>)["experience_description"] as string || (application as Record<string,unknown>)["about"] as string} />
          <Field label={t("become_tutor.education", "University / degrees / certificates")} value={(application as Record<string,unknown>)["education"] as string || (application as Record<string,unknown>)["university"] as string} />
          <Field label={t("admin.status", "Status")} value={(application as Record<string,unknown>)["status"] as string} />
          {((application as Record<string,unknown>)["created_at"] || (application as Record<string,unknown>)["createdAt"]) && (
            <Field label={t("common.submitted", "Submitted")} value={new Date((application as Record<string,unknown>)["created_at"] as string || (application as Record<string,unknown>)["createdAt"] as string).toLocaleDateString()} />
          )}
          {((application as Record<string,unknown>)["rejection_reason"] || (application as Record<string,unknown>)["rejectionReason"]) && (
            <Field label={t("tutor_application.rejection_reason", "Reason")} value={(application as Record<string,unknown>)["rejection_reason"] as string || (application as Record<string,unknown>)["rejectionReason"] as string} />
          )}
          {(application as Record<string,unknown>)["slug"] && <Field label="Slug" value={(application as Record<string,unknown>)["slug"] as string} />}
          {(application as Record<string,unknown>)["priceFrom"] && <Field label={t("marketplace.price", "Цена")} value={`${(application as Record<string,unknown>)["priceFrom"]} — ${(application as Record<string,unknown>)["priceTo"]} ${(application as Record<string,unknown>)["currency"] as string}`} />}
        </div>

        <div className="admin-drawer-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/messages")}
          >
            {t("admin.chat_with_applicant", "Chat with applicant")}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function PgAdminTutors() {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await adminApi.tutorApplications(statusFilter);
      if (response.ok) {
        setApplications(Array.isArray(data) ? data : data.content || []);
      } else {
        setError(data.message || data.error || t("common.error"));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await adminApi.approveTutor(approveTarget.id);
      toast.success(t("admin.tutor_approved", "Tutor approved successfully"));
      setApproveTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message || t("errors.default", "Something went wrong."));
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await adminApi.rejectTutor(rejectTarget.id, reason);
      toast.success(t("admin.tutor_rejected", "Tutor application rejected"));
      setRejectTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message || t("errors.default", "Something went wrong."));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { setPageTitle(t("admin.tutor_applications", "Tutor applications")); }, [setPageTitle, t]);

  // Marketplace: поддержка как legacy TUTOR_STATUS, так и новых RESUME_STATUS
  const statusTabs: [string, string][] = [
    ["", t("dashboard.all", "All")],
    [RESUME_STATUS.PENDING_MODERATION, t("statuses.PENDING", "На модерации")],
    [RESUME_STATUS.PUBLISHED, t("admin.published", "Опубликовано")],
    [RESUME_STATUS.REJECTED, t("admin.rejected", "Отклонено")],
    [RESUME_STATUS.SUSPENDED, t("admin.suspended", "Приостановлено")],
    [RESUME_STATUS.DRAFT, t("statuses.DRAFT", "Черновик")],
    // legacy fallback
    [TUTOR_STATUS.PENDING, t("tutor_application.pending", "На модерации")],
    [TUTOR_STATUS.APPROVED, t("admin.published", "Опубликовано")],
  ];
  // dedupe by value (keep first)
  const seen = new Set<string>();
  const dedupedTabs = statusTabs.filter(([v]) => {
    if (seen.has(v)) return false;
    seen.add(v);
    return true;
  });

  return (
    <>
      <div className="dashboard-tabs" role="tablist" aria-label={t("admin.tutor_applications", "Tutor applications")}>
        {dedupedTabs.map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            className={`tab-btn ${statusFilter === value ? "active" : ""}`}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label={t("common.loading")} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : applications.length === 0 ? (
        <EmptyState title={t("admin.no_applications", "No applications found")} />
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>{t("admin.name", "Name")}</th>
                <th>{t("admin.email", "Email")}</th>
                <th>{t("course.subject", "Subject")}</th>
                <th>{t("admin.status", "Status")}</th>
                <th>{t("admin.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => {
                const displayName = (a as Record<string, unknown>)["full_name"] as string || (a as Record<string, unknown>)["user"] as Record<string,unknown> && ((a as Record<string,unknown>)["user"] as Record<string,unknown>)["full_name"] as string || [ (a as Record<string,unknown>)["firstName"] as string, (a as Record<string,unknown>)["lastName"] as string].filter(Boolean).join(" ") || (a as Record<string,unknown>)["slug"] as string || "—";
                const displayEmail = (a as Record<string,unknown>)["email"] as string || ((a as Record<string,unknown>)["user"] as Record<string,unknown> && ((a as Record<string,unknown>)["user"] as Record<string,unknown>)["email"] as string) || "—";
                const subjectsVal = (a as Record<string,unknown>)["subjects"];
                const subjectsDisplay = Array.isArray(subjectsVal) ? (subjectsVal as unknown[]).map((s) => typeof s === "string" ? s : (s as Record<string,unknown>)["nameRu"] as string || (s as Record<string,unknown>)["slug"] as string || "").filter(Boolean).join(", ") : (subjectsVal as string) || "—";
                const status = (a as Record<string,unknown>)["status"] as string;
                const canApprove = status !== RESUME_STATUS.PUBLISHED && status !== TUTOR_STATUS.APPROVED && status !== "PUBLISHED";
                const canReject = status !== RESUME_STATUS.REJECTED && status !== TUTOR_STATUS.REJECTED;
                return (
                  <tr key={(a as Record<string,unknown>)["id"] as string} className="admin-app-row" onClick={() => setDetail(a)}>
                    <td>{displayName}</td>
                    <td>{displayEmail}</td>
                    <td>{subjectsDisplay}</td>
                    <td><Badge status={status}>{status}</Badge></td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      {canApprove && (
                        <button className="btn-primary" onClick={() => setApproveTarget(a)}>
                          {t("admin.approve", "Approve")}
                        </button>
                      )}
                      {canReject && (
                        <button className="btn-danger" onClick={() => setRejectTarget(a)}>
                          {t("admin.reject", "Reject")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!approveTarget}
        title={t("admin.approve_title", "Approve application?")}
        message={t("admin.approve_message", "{{name}} will become a verified tutor.", {
          name: approveTarget?.full_name || approveTarget?.user?.full_name || "",
        })}
        confirmLabel={t("admin.approve", "Approve")}
        loading={actionLoading}
        onCancel={() => setApproveTarget(null)}
        onConfirm={approve}
      />
      <ReasonModal
        isOpen={!!rejectTarget}
        title={t("admin.reject_title", "Reject application?")}
        loading={actionLoading}
        onCancel={() => setRejectTarget(null)}
        onConfirm={reject}
      />
      {detail && <ApplicationDrawer application={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
