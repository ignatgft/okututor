import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { useDashboardResume } from "../features/dashboard/hooks/useDashboardResume";

function statusLabel(status: string, t: (k: string, fb: string) => string): string {
  const map: Record<string, string> = {
    DRAFT: t("statuses.DRAFT", "Черновик"),
    PENDING_MODERATION: t("tutor_status.PENDING_MODERATION", "На модерации"),
    PENDING: t("statuses.PENDING", "На модерации"),
    PUBLISHED: t("statuses.PUBLISHED", "Опубликовано"),
    REJECTED: t("statuses.REJECTED", "Отклонено"),
    SUSPENDED: t("tutor_status.SUSPENDED", "Приостановлено"),
  };
  return map[status] ?? status;
}

export default function PgDashboardResume(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  useEffect(() => { setPageTitle(t("tutor.resume", "Моё резюме") as string); }, [setPageTitle, t]);

  const { data: resume, isLoading, isError, error, refetch } = useDashboardResume(true);

  if (isLoading) return <Spinner label={t("common.loading", "Загрузка...") as string} />;
  if (isError) return <ErrorState message={(error as Error)?.message || t("common.error", "Ошибка") as string} onRetry={() => void refetch()} />;

  if (!resume) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <EmptyState
          icon="📄"
          title={t("dashboard.create_resume_title", "Создайте своё резюме") as string}
          hint={
            <span style={{ display: "block", maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
              {t("dashboard.create_resume_hint", "Разместите информацию о себе и принимайте обращения.")}
            </span>
          }
          action={
            <Link to="/become-tutor" className="btn-primary" style={{ textDecoration: "none" }}>
              {t("marketplace.create_resume", "Создать резюме")}
            </Link>
          }
        />
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/tutors" className="btn-secondary" style={{ textDecoration: "none" }}>{t("dashboard.find_tutors", "Найти репетитора")}</Link>
          <Link to="/dashboard/requests" className="btn-secondary" style={{ textDecoration: "none" }}>{t("navigation.requests", "Обращения")}</Link>
        </div>
      </div>
    );
  }

  const status = resume.status as string;
  const views = resume.viewsCount ?? 0;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 800, margin: "0 auto", width: "100%" }}>
      <div className="card" style={{ padding: 20, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>{resume.firstName} {resume.lastName ?? ""}</h2>
            {resume.title && <p style={{ margin: "4px 0 0", color: "var(--color-text-secondary)" }}>{resume.title}</p>}
            {resume.slug && <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>/{resume.slug}</p>}
          </div>
          <Badge status={status}>{statusLabel(status, t as (k: string, fb: string) => string)}</Badge>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div style={{ padding: 12, background: "var(--color-bg-secondary)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
            <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>{views}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{t("dashboard.resume_views", "Просмотры")}</div>
          </div>
          <div style={{ padding: 12, background: "var(--color-bg-secondary)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>{resume.subjects?.map((s) => s.nameRu).join(", ") || "—"}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{t("tutor.subjects", "Предметы")}</div>
          </div>
          <div style={{ padding: 12, background: "var(--color-bg-secondary)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>{resume.city?.nameRu || (resume.online ? "Online" : "—")}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{t("common.location", "Локация")}</div>
          </div>
        </div>

        {resume.shortDescription && <p style={{ marginTop: 16, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{resume.shortDescription}</p>}
        {resume.about && <p style={{ marginTop: 8, color: "var(--color-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{resume.about}</p>}

        {status === "REJECTED" && resume.rejectionReason && (
          <div style={{ marginTop: 16, padding: 12, background: "var(--color-danger-soft, #FEF2F2)", border: "1px solid var(--color-danger)", borderRadius: "var(--radius-lg)", color: "var(--color-danger)" }}>
            <strong>{t("tutor_application.rejection_reason", "Причина")}:</strong> {resume.rejectionReason}
          </div>
        )}
        {status === "PENDING_MODERATION" && (
          <p style={{ marginTop: 16, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{t("become_tutor.verification_hint", "Ваша заявка будет рассмотрена нашей командой.")}</p>
        )}
        {status === "SUSPENDED" && (
          <p style={{ marginTop: 16, fontSize: "var(--font-size-sm)", color: "var(--color-danger)" }}>{t("dashboard.resume_suspended_hint", "Резюме приостановлено")}</p>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to={`/tutor/${resume.slug}`} className="btn-secondary" style={{ textDecoration: "none" }}>{t("common.view", "Открыть резюме")}</Link>
          <Link to="/become-tutor" className="btn-primary" style={{ textDecoration: "none" }}>{t("common.edit", "Редактировать резюме")}</Link>
          <Link to="/tutors" className="btn-ghost" style={{ textDecoration: "none" }}>{t("dashboard.find_tutors", "Найти репетитора")}</Link>
        </div>
      </div>

      <div className="card" style={{ padding: 16, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "var(--font-size-base)" }}>{t("dashboard.quick_actions", "Быстрые действия")}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: "none" }}>{t("dashboard.overview", "Обзор")}</Link>
          <Link to="/dashboard/requests" className="btn-secondary" style={{ textDecoration: "none" }}>{t("navigation.requests", "Обращения")}</Link>
          <Link to="/dashboard/profile" className="btn-secondary" style={{ textDecoration: "none" }}>{t("navbar.profile", "Профиль")}</Link>
        </div>
      </div>
    </div>
  );
}
