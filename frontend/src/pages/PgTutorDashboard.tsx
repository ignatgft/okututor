// Marketplace Tutor Dashboard — «Моё резюме» (Spec §6)
// Spec: Статус (На модерации/Опубликовано/Отклонено) / Просмотры / Новые обращения / Последние обращения
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { tutorProfileMarketplaceApi, type TutorProfileMeResponse } from "../api/marketplace/tutorProfileMarketplace.api";
import { tutorRequestsMarketplaceApi, type TutorRequestDto } from "../api/marketplace/tutorRequestsMarketplace.api";
import { apiClient } from "../api/http";
import "../styles/Dashboard.css";

type ResumeStatus = "DRAFT" | "PENDING_MODERATION" | "PUBLISHED" | "REJECTED" | "SUSPENDED" | string;

function statusLabel(status: ResumeStatus, t: (k: string, fb: string) => string): string {
  const map: Record<string, string> = {
    DRAFT: "Черновик",
    PENDING_MODERATION: "На модерации",
    PENDING: "На модерации",
    PUBLISHED: "Опубликовано",
    REJECTED: "Отклонено",
    SUSPENDED: "Приостановлено",
  };
  return t(`tutor_status.${status}`, map[status] ?? status);
}

export default function PgTutorDashboard(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const [resume, setResume] = useState<TutorProfileMeResponse | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState("");
  const [requests, setRequests] = useState<TutorRequestDto[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [stats, setStats] = useState<{ views?: number; favorites?: number } | null>(null);

  useEffect(() => { setPageTitle(t("tutor.resume", "Моё резюме") as string); }, [setPageTitle, t]);

  const loadResume = useCallback(async () => {
    setResumeLoading(true);
    setResumeError("");
    try {
      const { response, data } = await tutorProfileMarketplaceApi.me();
      if (response.ok) setResume(data as TutorProfileMeResponse);
      else {
        if (response.status === 404) setResume(null);
        else {
          const msg = (data as Record<string, unknown>)?.["message"] as string ?? (t("errors.default", "Ошибка") as string);
          // Fallback legacy: try old myApplication
          if (response.status === 404 || response.status === 401) setResume(null);
          else setResumeError(msg);
        }
      }
    } catch (e: unknown) {
      setResumeError(e instanceof Error ? e.message : String(e));
    } finally { setResumeLoading(false); }
  }, [t]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const { response, data } = await tutorRequestsMarketplaceApi.myAsTutor(0, 20);
      if (response.ok) {
        const list = Array.isArray((data as Record<string, unknown>)["content"]) ? (data as Record<string, unknown>)["content"] as TutorRequestDto[] : Array.isArray(data) ? data as TutorRequestDto[] : [];
        setRequests(list);
      } else {
        // fallback to generic list
        const fb = await tutorRequestsMarketplaceApi.list(0, 20);
        if (fb.response.ok) {
          const d = fb.data as Record<string, unknown>;
          const list = Array.isArray(d["content"]) ? d["content"] as TutorRequestDto[] : [];
          setRequests(list.filter((r) => String((r as Record<string, unknown>)["tutorUserId"]) !== ""));
        }
      }
    } catch {
      // ignore
    } finally { setRequestsLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { response, data } = await apiClient.get("/api/v1/tutors/me/stats");
      if (response.ok && data && typeof data === "object") setStats(data as Record<string, unknown>);
      else if (resume) setStats({ views: resume.viewsCount });
    } catch {
      setStats(resume ? { views: resume.viewsCount } : null);
    }
  }, [resume]);

  useEffect(() => { void loadResume(); void loadRequests(); }, [loadResume, loadRequests]);
  useEffect(() => { if (resume) void loadStats(); }, [resume, loadStats]);

  const resumeStatus: ResumeStatus = (resume?.status as string) ?? "DRAFT";
  const rejectionReason = (resume?.rejectionReason as string) ?? "";
  const newRequests = requests.filter((r) => r.status === "NEW");
  const lastRequests = requests.slice(0, 5);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{t("tutor.application", "Моё резюме")}</h2>

      {resumeLoading ? (
        <Spinner label={t("common.loading", "Загрузка...") as string} />
      ) : resumeError ? (
        <ErrorState message={resumeError} onRetry={loadResume} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Статус</div>
                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge status={String(resumeStatus)}>{statusLabel(String(resumeStatus), t as (k: string, fb: string) => string)}</Badge>
                  {resumeStatus === "REJECTED" && rejectionReason && (
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-danger)" }}>{rejectionReason}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!resume && <Link to="/become-tutor" className="btn-primary">{t("marketplace.create_resume", "Создать резюме")}</Link>}
                {resume && resumeStatus === "DRAFT" && <Link to="/become-tutor" className="btn-primary">{t("common.edit", "Редактировать")}</Link>}
                {resume && resumeStatus === "REJECTED" && <Link to="/become-tutor" className="btn-primary">{t("common.edit", "Исправить")}</Link>}
                <Link to="/tutor/application" className="btn-secondary">{t("common.view", "Подробнее")}</Link>
              </div>
            </div>
            {!resume && (
              <p style={{ marginTop: 12, color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
                {t("tutor_application.no_application", "Вы ещё не подавали заявку") } — {t("marketplace.become_sales3", "Размести своё резюме и найди первых учеников.") }
              </p>
            )}
            {resumeStatus === "PENDING" && <p style={{ marginTop: 8, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{t("become_tutor.verification_hint", "Ваша заявка будет рассмотрена нашей командой.")}</p>}
            {resumeStatus === "PUBLISHED" && <p style={{ marginTop: 8, fontSize: "var(--font-size-sm)", color: "var(--color-success)" }}>Ваше резюме опубликовано и видно ученикам.</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{stats?.views ?? resume?.viewsCount ?? "—"}</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Просмотры</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{newRequests.length}</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Новые обращения</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{requests.length}</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Всего обращений</div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Последние обращения</h3>
              <Link to="/tutor/requests" className="btn-ghost">{t("common.view", "Все")}</Link>
            </div>
            {requestsLoading ? (
              <div style={{ marginTop: 12 }}><Spinner label={t("common.loading", "Загрузка...") as string} /></div>
            ) : lastRequests.length === 0 ? (
              <div style={{ marginTop: 12 }}><EmptyState title={t("tutor_dashboard.no_pending", "Нет обращений")} hint={t("tutor_dashboard.no_pending_hint", "Новые обращения появятся здесь.") as string} /></div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {lastRequests.map((r) => (
                  <Link key={String(r.id)} to={`/tutor/requests/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{r.studentName || "Студент"}</div>
                        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis" }}>{r.studentContact} {r.message ? `· ${r.message.slice(0, 40)}` : ""}</div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <Badge status={r.status}>{r.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy: Booking / Schedule / Lesson removed — see LEGACY_EDTECH.md */}
    </>
  );
}
