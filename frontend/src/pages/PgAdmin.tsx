// migrated to TSX — minimal strict types (controlled)
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/http";
import { endpoints } from "../api/endpoints";
import { adminApi } from "../api/admin.api";
import { usePageTitle } from "../components/pageTitleContext";
import { ErrorState, Skeleton } from "../components/ui/Primitives";
import useAuthStore from "../store/authStore";
import { Activity, BarChart3, ClipboardList, FileText, Inbox, LifeBuoy, UserPlus, Users } from "lucide-react";
import "../styles/Admin.css";

export default function PgAdmin() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setPageTitle = usePageTitle();
  useEffect(() => { setPageTitle(t("admin.dashboard", "Admin Dashboard")); }, [setPageTitle, t]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s1, s2, s3] = await Promise.all([
        apiClient.get(endpoints.admin.stats),
        apiClient.get(endpoints.adminMetrics.overview),
        adminApi.metricsUsers(1),
      ]);
      const merged = {} as Record<string, unknown>;
      if (s1.response.ok) Object.assign(merged, s1.data as Record<string, unknown>);
      if (s2.response.ok) Object.assign(merged, s2.data as Record<string, unknown>);
      if (s3.response.ok) Object.assign(merged, s3.data as Record<string, unknown>);
      // fallback to s1 if s2 fails
      if (s1.response.ok || s2.response.ok || s3.response.ok) setStats(merged);
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

  const record = stats as Record<string, unknown>;
  const getNumber = (...keys: string[]): number => {
    for (const key of keys) {
      const value = Number(record[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  };
  const totalUsers = getNumber("total_users", "totalUsers");
  const pendingProfiles = getNumber("pending_tutor_profiles");
  const publishedProfiles = getNumber("published_tutor_profiles");
  const activeProfiles = getNumber("active_tutor_profiles");
  const expiringProfiles = getNumber("expiring_soon_tutor_profiles");
  const newUsers = getNumber("new_in_period");
  const verifiedUsers = getNumber("verified");
  const blockedUsers = getNumber("blocked");
  const adminName = user?.full_name || user?.email || t("admin.administrator", "Администратор");
  const adminInitials = adminName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A";
  const statusDistribution = [
    { label: t("admin.pending", "На рассмотрении"), value: pendingProfiles, color: "var(--color-warning)" },
    { label: t("admin.published", "Опубликовано"), value: publishedProfiles, color: "var(--color-success)" },
    { label: t("admin.rejected", "Отклонено"), value: getNumber("rejected_tutor_profiles"), color: "var(--color-danger)" },
    { label: t("admin.suspended", "Приостановлено"), value: getNumber("suspended_tutor_profiles"), color: "var(--color-danger)" },
    { label: t("statuses.HIDDEN", "Скрыто"), value: getNumber("hidden_tutor_profiles"), color: "var(--color-text-muted)" },
    { label: t("statuses.ARCHIVED", "Архив"), value: getNumber("archived_tutor_profiles"), color: "var(--color-text-muted)" },
    { label: t("statuses.EXPIRED", "Истекло"), value: getNumber("expired_tutor_profiles"), color: "var(--color-warning)" },
  ];
  const maxStatusValue = Math.max(1, ...statusDistribution.map((item) => item.value));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>{t("admin.dashboard", "Дашборд")}</h1>
          <p>{t("admin.dashboard_subtitle", "Обзор ключевых метрик и активности платформы")}</p>
        </div>
        <div className="admin-user-chip">
          <span className="admin-user-avatar" aria-hidden="true">
            {user?.avatar ? <img loading="lazy" decoding="async" src={user.avatar} alt="" /> : adminInitials}
          </span>
          <span className="admin-user-text">
            <strong>{adminName}</strong>
            <span>{user?.email && user.email !== adminName ? user.email : user?.role}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <Skeleton count={4} className="skeleton-card" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStats} />
      ) : (
        <>
          <div className="admin-kpi-grid">
            <div className="admin-kpi">
              <span className="admin-kpi-icon admin-kpi-icon--users" aria-hidden="true"><Users size={22} /></span>
              <div>
                <p>{t("admin.users", "Пользователи")}</p>
                <strong>{totalUsers.toLocaleString()}</strong>
                <small>{t("admin.verified", "Подтверждено")}: {verifiedUsers.toLocaleString()} · {t("admin.blocked", "Заблокировано")}: {blockedUsers.toLocaleString()}</small>
              </div>
            </div>
            <div className="admin-kpi">
              <span className="admin-kpi-icon admin-kpi-icon--queue" aria-hidden="true"><FileText size={22} /></span>
              <div>
                <p>{t("admin.tutor_applications", "Заявки репетиторов")}</p>
                <strong>{pendingProfiles.toLocaleString()}</strong>
                <small>{t("admin.published", "Опубликовано")}: {publishedProfiles.toLocaleString()}</small>
              </div>
            </div>
            <div className="admin-kpi">
              <span className="admin-kpi-icon admin-kpi-icon--new" aria-hidden="true"><UserPlus size={22} /></span>
              <div>
                <p>{t("admin.new_users_24h", "Новые за 24ч")}</p>
                <strong>{newUsers.toLocaleString()}</strong>
                <small>{t("admin.new_registrations", "Новые регистрации")}</small>
              </div>
            </div>
            <div className="admin-kpi">
              <span className="admin-kpi-icon admin-kpi-icon--active" aria-hidden="true"><Activity size={22} /></span>
              <div>
                <p>{t("admin.active_profiles", "Активные анкеты")}</p>
                <strong>{activeProfiles.toLocaleString()}</strong>
                <small>{t("admin.expiring_soon", "Истекают (7д)")}: {expiringProfiles.toLocaleString()}</small>
              </div>
            </div>
          </div>

          <section className="admin-panel" aria-label={t("admin.profile_statuses", "Статусы анкет")}>
            <h2>{t("admin.profile_statuses", "Статусы анкет сейчас")}</h2>
            <p className="admin-panel-note">{t("admin.profile_statuses_hint", "Текущий срез очереди модерации")}</p>
            <div className="admin-status-list">
              {statusDistribution.map((item) => (
                <div key={item.label} className="admin-status-row">
                  <span>{item.label}</span>
                  <span className="admin-status-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((item.value / maxStatusValue) * 100)}%`, background: item.color }} />
                  </span>
                  <strong>{item.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel" aria-label={t("admin.quick_actions", "Быстрые действия")}>
            <h2>{t("admin.quick_actions", "Быстрые действия")}</h2>
            <div className="admin-quick-grid" style={{ marginTop: 12 }}>
              <Link to="/admin/users" className="admin-quick-card">
                <span className="admin-quick-icon" aria-hidden="true"><Users size={22} /></span>
                <span><strong>{t("admin.manage_users", "Управление пользователями")}</strong><span>{t("admin.manage_users_hint", "Поиск, роли, блокировка и аналитика")}</span></span>
              </Link>
              <Link to="/admin/tutors" className="admin-quick-card">
                {pendingProfiles > 0 && <span className="admin-quick-badge">{pendingProfiles > 99 ? "99+" : pendingProfiles}</span>}
                <span className="admin-quick-icon" aria-hidden="true"><ClipboardList size={22} /></span>
                <span><strong>{t("admin.tutor_applications", "Заявки репетиторов")}</strong><span>{t("admin.new_applications_hint", "Новые заявки на рассмотрение")}</span></span>
              </Link>
              <Link to="/admin/requests" className="admin-quick-card">
                <span className="admin-quick-icon" aria-hidden="true"><Inbox size={22} /></span>
                <span><strong>{t("navigation.requests", "Заявки")}</strong><span>{t("admin.requests_hint", "Просмотр и обработка заявок")}</span></span>
              </Link>
              <Link to="/admin/support" className="admin-quick-card">
                <span className="admin-quick-icon" aria-hidden="true"><LifeBuoy size={22} /></span>
                <span><strong>{t("admin.support", "Поддержка")}</strong><span>{t("admin.support_hint", "Ответы на обращения пользователей")}</span></span>
              </Link>
              <Link to="/admin/metrics" className="admin-quick-card">
                <span className="admin-quick-icon" aria-hidden="true"><BarChart3 size={22} /></span>
                <span><strong>{t("admin.metrics", "Метрики")}</strong><span>{t("admin.metrics_hint", "Подробная аналитика платформы")}</span></span>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
