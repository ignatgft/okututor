import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { tutorProfileMarketplaceApi } from "../api/marketplace/tutorProfileMarketplace.api";
import { tutorRequestsMarketplaceApi } from "../api/marketplace/tutorRequestsMarketplace.api";
import { Link } from "react-router-dom";

export default function PgTutorStats(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setPageTitle(t("navbar.stats", "Статистика") as string); }, [setPageTitle, t]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [pRes, rRes] = await Promise.all([
        tutorProfileMarketplaceApi.me().catch(() => ({ response: { ok: false, status: 404 } as Response, data: null })),
        tutorRequestsMarketplaceApi.myAsTutor(0, 100).catch(() => ({ response: { ok: false } as Response, data: null })),
      ]);
      if ((pRes as { response: Response }).response.ok) setProfile((pRes as { data: Record<string, unknown> }).data);
      if ((rRes as { response: Response }).response.ok) {
        const d = (rRes as { data: unknown }).data as Record<string, unknown>;
        const list = Array.isArray(d["content"]) ? d["content"] as Record<string, unknown>[] : Array.isArray(d) ? d as Record<string, unknown>[] : [];
        setRequests(list);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Spinner label={t("common.loading", "Загрузка...") as string} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profile) return <EmptyState title={t("tutor_application.no_application", "Резюме не создано")} hint={<Link to="/become-tutor" className="btn-primary">{t("marketplace.create_resume", "Создать резюме")}</Link>} />;

  const views = (profile["viewsCount"] as number) ?? (profile["views_count"] as number) ?? 0;
  const status = String(profile["status"] ?? "DRAFT");
  const total = requests.length;
  const byStatus = {
    NEW: requests.filter(r => r["status"] === "NEW").length,
    VIEWED: requests.filter(r => r["status"] === "VIEWED").length,
    CONTACTED: requests.filter(r => r["status"] === "CONTACTED").length,
    CLOSED: requests.filter(r => r["status"] === "CLOSED").length,
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h2 style={{ margin: 0 }}>{t("navbar.stats", "Статистика")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{views}</div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Просмотры</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{total}</div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Всего обращений</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{byStatus.NEW}</div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Новые</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Статус</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>{status}</div>
        </div>
      </div>
      <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
        <h3 style={{ marginTop: 0 }}>{t("marketplace.stats_breakdown", "Разбивка по статусам")}</h3>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {(["NEW", "VIEWED", "CONTACTED", "CLOSED"] as const).map(s => (
            <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--color-bg-secondary)", borderRadius: 8 }}>
              <span>{s}</span><strong>{byStatus[s]}</strong>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <Link to="/tutor/requests" className="btn-primary">{t("navigation.requests", "Обращения")}</Link>
          <Link to="/tutor/application" className="btn-secondary">{t("tutor.resume", "Моё резюме")}</Link>
        </div>
      </div>
    </div>
  );
}
