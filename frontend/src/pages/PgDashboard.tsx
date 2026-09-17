// Marketplace Student Dashboard — «Мои обращения»
// Spec §6: Репетитор / Предмет / Дата / Статус (NEW/VIEWED/CONTACTED/CLOSED)
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { tutorRequestsMarketplaceApi, type TutorRequestDto } from "../api/marketplace/tutorRequestsMarketplace.api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function toList(data: unknown): TutorRequestDto[] {
  if (Array.isArray(data)) return data as TutorRequestDto[];
  if (isRecord(data) && Array.isArray((data as Record<string, unknown>)["content"])) return (data as Record<string, unknown>)["content"] as TutorRequestDto[];
  if (isRecord(data) && Array.isArray((data as Record<string, unknown>)["items"])) return (data as Record<string, unknown>)["items"] as TutorRequestDto[];
  return [];
}

function statusLabel(s: string, t: (k: string, fb: string) => string): string {
  const map: Record<string, string> = { NEW: "NEW", VIEWED: "VIEWED", CONTACTED: "CONTACTED", CLOSED: "CLOSED" };
  return t(`tutor_request.status_${s}`, map[s] ?? s);
}

export default function PgDashboard(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const [requests, setRequests] = useState<TutorRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => { setPageTitle(t("student_requests.title", "Мои обращения") as string); }, [setPageTitle, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await tutorRequestsMarketplaceApi.myAsStudent(0, 100);
      if (response.ok) setRequests(toList(data));
      else {
        const rec = isRecord(data) ? (data as Record<string, unknown>) : null;
        const msg = (rec?.["message"] as string) ?? (rec?.["error"] as string) ?? (t("common.error", "Error") as string);
        // Fallback to generic list (student first) — /api/v1/tutor-requests
        if (response.status === 404) {
          const fb = await tutorRequestsMarketplaceApi.list(0, 100);
          if (fb.response.ok) setRequests(toList(fb.data));
          else setError(msg);
        } else setError(msg);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const filtered = statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{t("student_requests.title", "Мои обращения")}</h2>
        <Link to="/tutors" className="btn-primary">{t("dashboard.find_tutors", "Найти репетитора")}</Link>
      </div>

      <div className="dashboard-tabs" style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          ["all", t("dashboard.all", "Все")],
          ["NEW", "NEW"],
          ["VIEWED", "VIEWED"],
          ["CONTACTED", "CONTACTED"],
          ["CLOSED", "CLOSED"],
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={`tab-btn ${statusFilter === val ? "active" : ""}`}
            onClick={() => setStatusFilter(val)}
            style={{ padding: "8px 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)", background: statusFilter === val ? "var(--color-primary)" : "var(--color-surface)", color: statusFilter === val ? "#fff" : "var(--color-text)" }}
            aria-pressed={statusFilter === val}
          >
            {String(label)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ marginTop: 24 }}><Spinner label={t("common.loading", "Загрузка...") as string} /></div>
      ) : error ? (
        <div style={{ marginTop: 24 }}><ErrorState message={error} onRetry={load} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            title={requests.length === 0 ? (t("student_requests.empty", "Заявок пока нет") as string) : (t("student_requests.empty_tab", "Ничего в этой вкладке") as string)}
            hint={requests.length === 0 ? <Link to="/tutors" className="btn-primary">{t("dashboard.find_tutors", "Найти репетитора")}</Link> : (t("student_requests.empty_tab_hint", "Проверьте другие вкладки") as string)}
          />
        </div>
      ) : (
        <div className="bookings-list" style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {filtered.map((r) => {
            // Map TutorRequest → marketplace columns: Репетитор / Предмет / Дата / Статус
            // Репетитор: slug link; Предмет: message snippet; Дата: createdAt
            const tutorLabel = r.tutorProfileSlug || String(r.tutorUserId).slice(0, 8);
            const subject = r.message ? r.message.slice(0, 60) + (r.message.length > 60 ? "…" : "") : t("common.tutor", "Репетитор");
            return (
              <Link key={String(r.id)} to={`/student/requests/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="booking-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{tutorLabel}</div>
                    {subject && <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>{subject}</div>}
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>{new Date(r.createdAt).toLocaleDateString()} · {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <Badge status={r.status}>{statusLabel(r.status, t as (k: string, fb: string) => string)}</Badge>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{r.studentContact}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {/* UX flow: Найти → Открыть профиль → Связаться → Создать обращение → Мои обращения (no Booking/Schedule/Lesson) */}
    </>
  );
}
