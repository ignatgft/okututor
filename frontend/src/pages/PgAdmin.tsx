// migrated to TSX — minimal strict types (controlled)
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/http";
import { endpoints } from "../api/endpoints";
import { usePageTitle } from "../components/pageTitleContext";
import { ErrorState, Skeleton } from "../components/ui/Primitives";
import "../styles/Admin.css";

export default function PgAdmin() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setPageTitle = usePageTitle();
  useEffect(() => { setPageTitle(t("admin.dashboard", "Admin Dashboard")); }, [setPageTitle, t]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s1, s2] = await Promise.all([
        apiClient.get(endpoints.admin.stats),
        apiClient.get(endpoints.adminMetrics.overview),
      ]);
      const merged = {} as Record<string, unknown>;
      if (s1.response.ok) Object.assign(merged, s1.data as Record<string, unknown>);
      if (s2.response.ok) Object.assign(merged, s2.data as Record<string, unknown>);
      // fallback to s1 if s2 fails
      if (s1.response.ok || s2.response.ok) setStats(merged);
      else setError((s1.data as Record<string, unknown>)?.["error"] as string || t("errors.default", "Something went wrong."));
    } catch (e) {
      setError(t("errors.network", "Network error") + ": " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <>
      {loading ? (
        <Skeleton count={4} className="skeleton-card" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStats} />
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card"><h3>{Number((stats as Record<string, unknown>)["total_users"] ?? (stats as Record<string, unknown>)["totalUsers"] ?? 0)}</h3><p>{t("admin.users", "Пользователи")}</p><small style={{color:"var(--color-text-muted)",fontSize:12}}>{t("admin.metrics.active_users","Активные (24ч)")}: {Number((stats as Record<string, unknown>)["active_users"] ?? 0)}</small></div>
            <div className="stat-card"><h3>{Number((stats as Record<string, unknown>)["total_tutor_profiles"] ?? (stats as Record<string, unknown>)["total_tutors"] ?? (stats as Record<string, unknown>)["totalTutors"] ?? 0)}</h3><p>{t("admin.tutor_applications", "Резюме")}</p><small style={{color:"var(--color-text-muted)",fontSize:12}}>{t("admin.pending","На рассмотрении")}: {Number((stats as Record<string, unknown>)["pending_tutor_profiles"] ?? 0)} · {t("admin.published","Опубликовано")}: {Number((stats as Record<string, unknown>)["published_tutor_profiles"] ?? (stats as Record<string, unknown>)["active_tutor_profiles"] ?? 0)}</small></div>
            <div className="stat-card"><h3>{Number((stats as Record<string, unknown>)["total_tutor_requests"] ?? (stats as Record<string, unknown>)["total_requests"] ?? 0)}</h3><p>{t("navigation.requests", "Заявки")}</p><small style={{color:"var(--color-text-muted)",fontSize:12}}>Активные: {Number((stats as Record<string, unknown>)["active_tutor_profiles"] ?? 0)}</small></div>
            <div className="stat-card"><h3>{Number((stats as Record<string, unknown>)["total_reviews"] ?? 0)}</h3><p>Отзывы</p><small style={{color:"var(--color-text-muted)",fontSize:12}}>Скрыто: {Number((stats as Record<string, unknown>)["hidden_tutor_profiles"] ?? 0)} · Архив: {Number((stats as Record<string, unknown>)["archived_tutor_profiles"] ?? 0)}</small></div>
            <div className="stat-card" style={{borderColor:"var(--color-warning)"}}><h3 style={{color:"var(--color-warning)"}}>{Number((stats as Record<string, unknown>)["expiring_soon_tutor_profiles"] ?? 0)}</h3><p>Истекают (7д)</p></div>
            <div className="stat-card" style={{borderColor:"var(--color-danger)"}}><h3 style={{color:"var(--color-danger)"}}>{Number((stats as Record<string, unknown>)["expired_tutor_profiles"] ?? 0)}</h3><p>Истекло</p></div>
          </div>

          <div className="pending-section">
            <h2>{t("admin.quick_actions", "Quick actions")}</h2>
            <div className="booking-actions">
              <Link to="/admin/users" className="btn-primary">{t("admin.manage_users", "Manage users")}</Link>
              <Link to="/admin/tutors" className="btn-secondary">{t("admin.tutor_applications", "Резюме")}</Link>
              <Link to="/admin/requests" className="btn-secondary">{t("navigation.requests", "Обращения")}</Link>
              <Link to="/admin/support" className="btn-secondary">{t("admin.support", "Support")}</Link>
              <Link to="/admin/metrics" className="btn-secondary">{t("admin.metrics", "Metrics")}</Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
