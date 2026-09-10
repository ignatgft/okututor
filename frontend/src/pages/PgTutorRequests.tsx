import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { Tabs } from "../components/ui/Tabs";
import { useToast } from "../components/ui/Toast";
import { tutorRequestsMarketplaceApi, type TutorRequestDto } from "../api/marketplace/tutorRequestsMarketplace.api";
import "../styles/Dashboard.css";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null; }
function toList(d: unknown): TutorRequestDto[] {
  if (Array.isArray(d)) return d as TutorRequestDto[];
  if (isRecord(d) && Array.isArray((d as Record<string, unknown>)["content"])) return (d as Record<string, unknown>)["content"] as TutorRequestDto[];
  return [];
}
function statusLabel(s: string, t: (k: string, fb: string) => string): string {
  const map: Record<string, string> = { NEW: "NEW", VIEWED: "VIEWED", CONTACTED: "CONTACTED", CLOSED: "CLOSED" };
  return t(`tutor_request.status_${s}`, map[s] ?? s);
}

export default function PgTutorRequestsMarketplace(): JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const setPageTitle = usePageTitle();
  const [requests, setRequests] = useState<TutorRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("NEW");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { setPageTitle(t("tutor_request.title", "Обращения") as string); }, [setPageTitle, t]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { response, data } = await tutorRequestsMarketplaceApi.myAsTutor(0, 100);
      if (response.ok) setRequests(toList(data));
      else {
        const rec = isRecord(data) ? data as Record<string, unknown> : null;
        setError((rec?.["message"] as string) ?? (rec?.["error"] as string) ?? (t("common.error", "Ошибка") as string));
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const counts = {
    NEW: requests.filter(r => r.status === "NEW").length,
    VIEWED: requests.filter(r => r.status === "VIEWED").length,
    CONTACTED: requests.filter(r => r.status === "CONTACTED").length,
    CLOSED: requests.filter(r => r.status === "CLOSED").length,
  };

  const tabs = [
    { value: "NEW", label: `NEW ${counts.NEW ? `(${counts.NEW})` : ""}` },
    { value: "VIEWED", label: `VIEWED ${counts.VIEWED ? `(${counts.VIEWED})` : ""}` },
    { value: "CONTACTED", label: `CONTACTED ${counts.CONTACTED ? `(${counts.CONTACTED})` : ""}` },
    { value: "CLOSED", label: `CLOSED ${counts.CLOSED ? `(${counts.CLOSED})` : ""}` },
  ];

  const visible = requests.filter(r => r.status === tab);
  const hasAny = requests.length > 0;

  const updateStatus = async (id: string, next: TutorRequestDto["status"]) => {
    setUpdating(id);
    try {
      const { response, data } = await tutorRequestsMarketplaceApi.updateStatus(id, next);
      if (response.ok) {
        toast.success(t("tutor_request.status_updated", "Статус обновлён") as string);
        void load();
      } else {
        const msg = (data as Record<string, unknown>)?.["message"] as string ?? (data as Record<string, unknown>)?.["error"] as string ?? t("errors.default", "Ошибка") as string;
        toast.error(msg);
      }
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setUpdating(null); }
  };

  return (
    <>
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{t("tutor_request.title", "Обращения")}</h2>
        {counts.NEW > 0 && <span className="badge badge-new" style={{ background: "var(--color-primary)", color: "#fff", padding: "4px 10px", borderRadius: "var(--radius-full)", fontWeight: 700 }}>{counts.NEW} NEW</span>}
      </div>

      <Tabs items={tabs} active={tab} onChange={setTab} id="tutor-requests-tabs" />

      {loading ? <div style={{ marginTop: 16 }}><Spinner label={t("common.loading", "Загрузка...") as string} /></div>
        : error ? <div style={{ marginTop: 16 }}><ErrorState message={error} onRetry={load} /></div>
        : !hasAny ? <div style={{ marginTop: 16 }}><EmptyState title={t("tutor_request.empty_all", "Пока нет обращений")} hint={t("tutor_request.empty_hint", "Когда ученики свяжутся с вами, обращения появятся здесь.") as string} /></div>
        : visible.length === 0 ? <div style={{ marginTop: 16 }}><EmptyState title={t("tutor_request.empty_tab", "В этой вкладке пусто")} hint={t("tutor_request.empty_tab_hint", "Проверьте другие вкладки") as string} /></div>
        : (
          <div className="bookings-list" style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {visible.map(r => (
              <div key={r.id} className="booking-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginTop: 4 }}>{r.studentContact}</div>
                  {r.message && <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)", marginTop: 8, background: "var(--color-bg-secondary)", padding: 8, borderRadius: 8 }}>{r.message}</div>}
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 8 }}>{new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 120 }}>
                  <Badge status={r.status}>{statusLabel(r.status, t as (k: string, fb: string) => string)}</Badge>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                    {r.status === "NEW" && <button className="btn-primary" style={{ fontSize: "var(--font-size-xs)", padding: "6px 10px" }} disabled={updating === r.id} onClick={() => updateStatus(r.id, "VIEWED")}>Просмотрено</button>}
                    {r.status === "VIEWED" && <button className="btn-primary" style={{ fontSize: "var(--font-size-xs)", padding: "6px 10px" }} disabled={updating === r.id} onClick={() => updateStatus(r.id, "CONTACTED")}>Связался</button>}
                    {r.status !== "CLOSED" && <button className="btn-secondary" style={{ fontSize: "var(--font-size-xs)", padding: "6px 10px" }} disabled={updating === r.id} onClick={() => updateStatus(r.id, "CLOSED")}>Закрыть</button>}
                    {r.status === "NEW" && <button className="btn-ghost" style={{ fontSize: "var(--font-size-xs)" }} disabled={updating === r.id} onClick={() => updateStatus(r.id, "CONTACTED")}>Связался сразу</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}
