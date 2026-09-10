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
      const { response, data } = await apiClient.get(endpoints.admin.stats);
      if (response.ok) setStats(data);
      else setError(data.error || t("errors.default", "Something went wrong."));
    } catch (e) {
      setError(t("errors.network", "Network error") + ": " + e.message);
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
            <div className="stat-card"><h3>{(stats as Record<string, unknown>)["total_users"] as number || (stats as Record<string, unknown>)["totalUsers"] as number || 0}</h3><p>{t("admin.users", "Users")}</p></div>
            <div className="stat-card"><h3>{(stats as Record<string, unknown>)["total_tutors"] as number || (stats as Record<string, unknown>)["totalTutors"] as number || (stats as Record<string, unknown>)["total_resumes"] as number || 0}</h3><p>{t("admin.tutor_applications", "Резюме")}</p></div>
            <div className="stat-card"><h3>{(stats as Record<string, unknown>)["total_requests"] as number || (stats as Record<string, unknown>)["totalRequests"] as number || 0}</h3><p>{t("navigation.requests", "Обращения")}</p></div>
            <div className="stat-card"><h3>{(stats as Record<string, unknown>)["active_users"] as number || (stats as Record<string, unknown>)["activeUsers"] as number || 0}</h3><p>{t("admin.metrics.active_users", "Active (24h)")}</p></div>
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
