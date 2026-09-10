import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { Tabs } from "../components/ui/Tabs";
import { tutorRequestsMarketplaceApi, type TutorRequestDto } from "../api/marketplace/tutorRequestsMarketplace.api";
import "../styles/Dashboard.css";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function toList(data: unknown): TutorRequestDto[] {
  if (Array.isArray(data)) return data as TutorRequestDto[];
  if (isRecord(data) && Array.isArray((data as Record<string, unknown>)["content"])) return (data as Record<string, unknown>)["content"] as TutorRequestDto[];
  if (isRecord(data) && Array.isArray((data as Record<string, unknown>)["items"])) return (data as Record<string, unknown>)["items"] as TutorRequestDto[];
  return [];
}
function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err["message"] === "string") return err["message"] as string;
  return fallback;
}
function statusLabel(s: string, t: (k: string, fb: string) => string): string {
  const map: Record<string, string> = { NEW: "NEW", VIEWED: "VIEWED", CONTACTED: "CONTACTED", CLOSED: "CLOSED" };
  return t(`tutor_request.status_${s}`, map[s] ?? s);
}

export default function PgStudentRequests(): JSX.Element {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<TutorRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<string>("all");
  const setPageTitle = usePageTitle();
  useEffect(() => { setPageTitle(t("student_requests.title", "Мои обращения") as string); }, [setPageTitle, t]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await tutorRequestsMarketplaceApi.myAsStudent(0, 100);
      if (response.ok) setRequests(toList(data));
      else {
        const rec = isRecord(data) ? (data as Record<string, unknown>) : null;
        const msg = (rec?.["message"] as string) ?? (rec?.["error"] as string) ?? (t("common.error", "Error") as string);
        // fallback to generic list
        if (response.status === 404) {
          const fb = await tutorRequestsMarketplaceApi.list(0, 100);
          if (fb.response.ok) setRequests(toList(fb.data));
          else setError(msg);
        } else setError(msg);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, t("common.error", "Error") as string));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const tabs = [
    { value: "all", label: t("dashboard.all", "Все") as string },
    { value: "NEW", label: "NEW" },
    { value: "VIEWED", label: "VIEWED" },
    { value: "CONTACTED", label: "CONTACTED" },
    { value: "CLOSED", label: "CLOSED" },
  ];
  const visible = tab === "all" ? requests : requests.filter((r) => r.status === tab);
  const hasAny = requests.length > 0;

  return (
    <>
      <Tabs items={tabs} active={tab} onChange={setTab} id="student-requests-tabs" />
      {loading ? (
        <Spinner label={t("common.loading", "Loading...") as string} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !hasAny ? (
        <EmptyState
          title={t("student_requests.empty", "No requests yet") as string}
          hint={
            <Link to="/tutors" className="btn-primary">
              {t("dashboard.find_tutors", "Find Tutors")}
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t("student_requests.empty_tab", "Ничего в этой вкладке") as string}
          hint={t("student_requests.empty_tab_hint", "Проверьте другие вкладки — у вас есть обращения в другом статусе.") as string}
        />
      ) : (
        <div className="bookings-list" style={{ display: "grid", gap: 12 }}>
          {visible.map((r) => (
            <div key={String(r.id)} className="booking-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.tutorProfileSlug || r.tutorUserId.slice(0, 8)}</div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>{r.message ? r.message.slice(0, 80) + (r.message.length > 80 ? "…" : "") : t("marketplace.no_message", "Без сообщения")}</div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>{new Date(r.createdAt).toLocaleDateString()} · {r.studentContact}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <Badge status={r.status}>{statusLabel(r.status, t as (k: string, fb: string) => string)}</Badge>
                <Link to={`/repetitor/${r.tutorProfileSlug || r.tutorUserId}`} className="btn-ghost" style={{ fontSize: "var(--font-size-xs)" }}>{t("marketplace.view_tutor", "Профиль")}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
