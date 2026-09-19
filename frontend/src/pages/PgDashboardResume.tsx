import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "../components/pageTitleContext";
import { Eye, BookOpen, MapPin, Search, Home, Inbox, User } from "lucide-react";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { useDashboardResume } from "../features/dashboard/hooks/useDashboardResume";
import ResumeStatusCard from "../components/ResumeStatusCard";
import ResumeEditMenu from "../components/ResumeEditMenu";
import ResumeSharePanel from "../components/ResumeSharePanel";
import { tutorProfileMarketplaceApi } from "../api/marketplace/tutorProfileMarketplace.api";
import { tutorsApi } from "../api/tutors.api";
import { resumeStatusLabel } from "../utils/resumeStatus";
import { useQuery } from "@tanstack/react-query";

// --- styled stat card matching reference ---
function StatCard({
  icon,
  value,
  label,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  iconBg: string;
  iconColor: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-sm)",
        minWidth: 0,
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-full)",
          background: iconBg,
          color: iconColor,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text-primary)",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </span>
        <span
          style={{
            display: "block",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            fontWeight: "var(--font-weight-medium)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </span>
    </div>
  );
}

export default function PgDashboardResume(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    setPageTitle(t("tutor.resume", "Моё резюме") as string);
  }, [setPageTitle, t]);

  const { data: resume, isLoading, isError, error, refetch } = useDashboardResume(true);
  const { data: applicationRaw, isLoading: appLoading } = useQuery({
    queryKey: ["tutorApplication", "me"],
    queryFn: async () => {
      const res = await tutorsApi.myApplication();
      if (res.response.ok) return res.data as unknown as Record<string, unknown>;
      return null;
    },
    enabled: !resume && !isLoading,
    staleTime: 5_000,
    retry: false,
    refetchInterval: !resume ? 3000 : false,
    refetchOnWindowFocus: true,
  });
  const application = applicationRaw as unknown as Record<string, unknown> | null;

  const rec = resume as unknown as Record<string, unknown> | null;
  const pick = (camel: string, snake: string): unknown => rec?.[camel] ?? rec?.[snake];
  const str = (camel: string, snake: string): string => String(pick(camel, snake) ?? "");

  if (isLoading || (appLoading && !resume)) return <Spinner label={t("common.loading", "Загрузка...") as string} />;
  if (isError)
    return <ErrorState message={(error as Error)?.message || (t("common.error", "Ошибка") as string)} onRetry={() => void refetch()} />;

  // Показываем статус заявки на модерацию, если профиля ещё нет но заявка есть
  if (!resume && application) {
    const appStatus = String((application as Record<string, unknown>)["status"] ?? (application as Record<string, unknown>)["state"] ?? "PENDING");
    const isPending = ["PENDING", "PENDING_MODERATION", "REVIEW", "SUBMITTED"].includes(appStatus.toUpperCase());
    if (isPending) {
      return (
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: "var(--color-warning-soft)", color: "var(--color-warning)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>⏳</div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Резюме на модерации</h2>
            <p style={{ margin: "8px 0 0", color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
              {t("become_tutor.verification_hint", "Ваша заявка будет рассмотрена нашей командой.")} Обычно до 24 часов.
            </p>
            <div style={{ marginTop: 12, display: "inline-flex", gap: 8, alignItems: "center", padding: "6px 12px", borderRadius: 999, background: "var(--color-warning-soft)", color: "var(--color-warning)", fontSize: 12, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-warning)", display: "inline-block" }} />
              {resumeStatusLabel(appStatus) || "На модерации"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/app/dashboard" className="btn-secondary" style={{ textDecoration: "none" }}>Найти репетитора</Link>
            <button type="button" className="btn-ghost" onClick={() => void refetch()} style={{ fontSize: 13 }}>Обновить статус</button>
          </div>
        </div>
      );
    }
  }

  if (!resume) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <EmptyState
          icon={<Eye size={32} />}
          title={t("dashboard.create_resume_title", "Создайте своё резюме") as string}
          hint={
            <span style={{ display: "block", maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
              {t("dashboard.create_resume_hint", "Разместите информацию о себе и принимайте обращения.")}
            </span>
          }
          action={
            <button type="button" onClick={() => navigate("/app/resumes/new")} className="btn-primary">
              {t("marketplace.create_resume", "Создать резюме")}
            </button>
          }
        />
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/app/dashboard" className="btn-secondary" style={{ textDecoration: "none" }}>
            {t("dashboard.find_tutors", "Найти репетитора")}
          </Link>
          <Link to="/app/messages" className="btn-secondary" style={{ textDecoration: "none" }}>
            {t("navigation.requests", "Заявки")}
          </Link>
        </div>
      </div>
    );
  }

  const status = String(rec?.["status"] ?? "DRAFT");
  const views = Number(pick("viewsCount", "views_count") ?? 0);
  const name = `${str("firstName", "first_name")} ${str("lastName", "last_name")}`.trim() || t("tutor.resume", "Моё резюме");
  const title = str("title", "title");
  const slug = str("slug", "slug");
  const statusLabel = str("statusLabel", "status_label");
  const shortDescription = str("shortDescription", "short_description");
  const about = str("about", "about");
  const rejectionReason = str("rejectionReason", "rejection_reason");
  const resumePublishedAt = (pick("publishedAt", "published_at") as string | null) ?? null;
  const resumeExpiresAt = (pick("expiresAt", "expires_at") as string | null) ?? null;
  const resumeExpiringSoon = Boolean(pick("expiringSoon", "expiring_soon") ?? false);
  const subjects = (pick("subjects", "subjects") as Array<Record<string, unknown>> | undefined) ?? [];
  const city = pick("city", "city") as Record<string, unknown> | null | undefined;
  const isOnline = Boolean(pick("online", "online") ?? false);

  const invalidateResume = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tutorProfile", "me"] }),
      queryClient.invalidateQueries({ queryKey: ["tutorProfile"] }),
      queryClient.invalidateQueries({ queryKey: ["tutorSearch"] }),
      refetch(),
    ]);
  };

  const handleRenew = async () => {
    try {
      const res = await tutorProfileMarketplaceApi.renew();
      if ((res as unknown as { response?: { ok: boolean } })?.response?.ok ?? true) {
        await invalidateResume();
      } else alert((res as unknown as { data?: { message?: string } })?.data?.message || "Ошибка");
    } catch {
      const { apiClient } = await import("../api/http");
      const res = await apiClient.post("/api/v1/tutors/me/renew", {});
      if (res.response.ok) await invalidateResume();
      else alert((res.data as unknown as { message?: string })?.message || "Ошибка");
    }
  };
  const handleHide = async () => {
    try {
      const res = await tutorProfileMarketplaceApi.hide();
      if ((res as unknown as { response?: { ok: boolean } })?.response?.ok ?? true) await invalidateResume();
      else alert("Ошибка");
    } catch {
      const { apiClient } = await import("../api/http");
      const r = await apiClient.post("/api/v1/tutors/me/hide", {});
      if (r.response.ok) await invalidateResume();
    }
  };
  const handleRestore = async () => {
    try {
      const res = await tutorProfileMarketplaceApi.restore();
      if ((res as unknown as { response?: { ok: boolean } })?.response?.ok ?? true) await invalidateResume();
    } catch {
      const { apiClient } = await import("../api/http");
      const r = await apiClient.post("/api/v1/tutors/me/restore", {});
      if (r.response.ok) await invalidateResume();
    }
  };

  const subjectsLabel = subjects.map((s) => String(s["nameRu"] ?? s["name_ru"] ?? "")).filter(Boolean).join(", ") || t("common.not_found","—");
  const cityLabel = String(city?.["nameRu"] ?? city?.["name_ru"] ?? "") || (isOnline ? t("search.online","Онлайн") : "—");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 760, margin: "0 auto", width: "100%" }}>
      {/* ===== Main white card ===== */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: "visible",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-4)", borderBottom: "1px solid var(--color-border-light)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", lineHeight: 1.2 }}>{name}</h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: "#7C3AED",
                    color: "#fff",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-bold)",
                    letterSpacing: "0.04em",
                    lineHeight: 1.6,
                  }}
                >
                  ОРТ
                </span>
                {slug && (
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-muted)",
                      fontWeight: "var(--font-weight-regular)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 220,
                    }}
                  >
                    /{slug}
                  </span>
                )}
              </div>
              {title && <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", lineHeight: 1.4 }}>{title}</p>}
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                background: "color-mix(in srgb, var(--color-success) 14%, var(--color-surface))",
                border: "1px solid color-mix(in srgb, var(--color-success) 18%, transparent)",
                color: "var(--color-success)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-success)", display: "inline-block", flexShrink: 0 }} />
              {resumeStatusLabel(statusLabel || status) || t("common.published", "Опубликовано")}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "var(--space-4) var(--space-5)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
          <StatCard
            icon={<Eye size={20} strokeWidth={2} />}
            value={String(views)}
            label={t("dashboard.resume_views", "Просмотры резюме") as string}
            iconBg="color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))"
            iconColor="var(--color-primary)"
          />
          <StatCard
            icon={<BookOpen size={20} strokeWidth={2} />}
            value={subjectsLabel.length > 18 ? subjectsLabel.slice(0, 18) + "…" : subjectsLabel}
            label={t("tutor.subjects", "Предметы") as string}
            iconBg="color-mix(in srgb, var(--color-success) 12%, var(--color-surface))"
            iconColor="var(--color-success)"
          />
          <StatCard
            icon={<MapPin size={20} strokeWidth={2} />}
            value={cityLabel}
            label={t("common.location", "Локация") as string}
            iconBg="color-mix(in srgb, var(--color-info) 12%, var(--color-surface))"
            iconColor="var(--color-info)"
          />
        </div>

        {/* Status / active card */}
        <div style={{ padding: "0 var(--space-5) var(--space-4)" }}>
          <ResumeStatusCard
            status={status}
            publishedAt={resumePublishedAt}
            expiresAt={resumeExpiresAt}
            expiringSoon={Boolean(resumeExpiringSoon)}
            onEdit={() => navigate(resume ? "/app/resumes/edit" : "/app/resumes/edit")}
            onHide={handleHide}
            onRenew={handleRenew}
            onRestore={handleRestore}
          />
        </div>

        {/* About (collapsible) */}
        {(shortDescription || about) && (
          <div style={{ padding: "0 var(--space-5) var(--space-4)", borderTop: "1px solid var(--color-border-light)", marginTop: "var(--space-1)", paddingTop: "var(--space-4)" }}>
            {shortDescription && <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6, fontSize: "var(--font-size-sm)" }}>{shortDescription}</p>}
            {about && (
              <p style={{ margin: shortDescription ? "var(--space-2) 0 0" : 0, color: "var(--color-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "var(--font-size-sm)" }}>
                {about}
              </p>
            )}
          </div>
        )}

        {status === "REJECTED" && rejectionReason && (
          <div style={{ margin: "0 var(--space-5) var(--space-4)", padding: 12, background: "var(--color-danger-soft)", border: "1px solid var(--color-danger)", borderRadius: "var(--radius-lg)", color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>
            <strong>{t("tutor_application.rejection_reason", "Причина")}:</strong> {rejectionReason}
          </div>
        )}
        {status === "PENDING_MODERATION" && (
          <p style={{ margin: "0 var(--space-5) var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{t("become_tutor.verification_hint", "Ваша заявка будет рассмотрена нашей командой.")}</p>
        )}

        {/* Action row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-5)",
            borderTop: "1px solid var(--color-border-light)",
            background: "var(--color-bg-secondary)",
            borderBottomLeftRadius: "var(--radius-2xl)",
            borderBottomRightRadius: "var(--radius-2xl)",
          }}
        >
          <Link
            to="/app/resumes/preview"
            className="btn btn-secondary"
            style={{
              width: "100%",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-primary)",
              fontWeight: "var(--font-weight-semibold)",
              borderRadius: "var(--radius-lg)",
              minHeight: "var(--touch-target)",
            }}
          >
            <Eye size={18} /> {t("dashboard.preview_resume", "Предпросмотр")}
          </Link>
          <span style={{ display: "inline-flex", width: "100%" }}>
            <span style={{ width: "100%" }}>
              <ResumeEditMenu resumeId={resume.id} />
            </span>
          </span>
          <Link
            to="/app/dashboard"
            className="btn btn-primary"
            style={{
              width: "100%",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--color-primary)",
              color: "#fff",
              fontWeight: "var(--font-weight-semibold)",
              borderRadius: "var(--radius-lg)",
              minHeight: "var(--touch-target)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {t("dashboard.find_tutors", "Найти репетитора")} <Search size={16} />
          </Link>
        </div>
      </div>

      {/* Share panel — styled to match reference */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-4) var(--space-5)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <ResumeSharePanel resumeId={resume.id} />
      </div>

      {/* Quick actions */}
      <div
        className="card"
        style={{
          padding: "var(--space-4) var(--space-5)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>{t("dashboard.quick_actions", "Быстрые действия")}</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Link
            to="/app/dashboard"
            className="btn btn-secondary"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 14px",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            <Home size={16} /> {t("dashboard.overview", "Обзор")}
          </Link>
          <Link
            to="/app/messages"
            className="btn btn-secondary"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 14px",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            <Inbox size={16} /> {t("navigation.requests", "Заявки")}
          </Link>
          <Link
            to="/app/profile"
            className="btn btn-secondary"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 14px",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            <User size={16} /> {t("navbar.profile", "Мой профиль")}
          </Link>
        </div>
      </div>

      {/* Hidden debug Badge kept for a11y */}
      <span style={{ display: "none" }}>
        <Badge status={status}>{resumeStatusLabel(statusLabel || status)}</Badge>
      </span>
    </div>
  );
}
