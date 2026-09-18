import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Eye } from "lucide-react";
import { usePageTitle } from "../components/pageTitleContext";
import { Spinner, ErrorState, Badge } from "../components/ui/Primitives";
import { useToast } from "../components/ui/Toast";
import { useDashboardResume } from "../features/dashboard/hooks/useDashboardResume";
import { tutorProfileMarketplaceApi, type TutorProfileMeResponse } from "../api/marketplace/tutorProfileMarketplace.api";
import TutorResumeCard from "../features/tutors/components/TutorResumeCard";
import { resumeStatusLabel } from "../utils/resumeStatus";

export default function PgResumePreview(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const toast = useToast();
  const { data: resume, isLoading: resumeLoading, isError: resumeError } = useDashboardResume(true);
  const [preview, setPreview] = useState<TutorProfileMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageTitle(t("dashboard.preview_resume", "Предпросмотр резюме") as string);
  }, [setPageTitle, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await tutorProfileMarketplaceApi.preview();
        if (cancelled) return;
        if (res.response.ok) {
          setPreview(res.data as TutorProfileMeResponse);
        } else {
          setError((res.data as unknown as Record<string, unknown>)?.["message"] as string ?? t("common.error", "Ошибка") as string);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (resumeLoading || loading) return <Spinner label={t("common.loading", "Загрузка...") as string} />;
  if (resumeError || error) return <ErrorState message={error || t("common.error", "Ошибка") as string} />;
  if (!resume || !preview) return <ErrorState message={t("dashboard.no_resume", "Нет резюме") as string} />;

  const status = resume.status as string;
  const isPublic = status === "PUBLISHED";
  const statusLabel = String((resume as unknown as Record<string, unknown>)["statusLabel"] ?? (resume as unknown as Record<string, unknown>)["status_label"] ?? status);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <Link to="/app/resumes" className="btn-ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ArrowLeft size={16} /> {t("common.back", "Назад")}
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Eye size={16} style={{ color: "var(--color-text-muted)" }} />
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text)" }}>
            {t("dashboard.preview_title", "Предпросмотр резюме")}
          </span>
          <Badge status={status}>{resumeStatusLabel(statusLabel)}</Badge>
        </div>
      </div>

      <div
        style={{
          padding: "var(--space-3)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-primary-soft, #EEF2FF)",
          border: "1px solid var(--color-primary, #3563E9)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text)",
          lineHeight: 1.5,
        }}
      >
        {isPublic
          ? t("dashboard.preview_public_hint", "Так ваше резюме видят ученики в каталоге и поиске.")
          : t("dashboard.preview_moderation_hint", "Резюме ещё не опубликовано. Ниже показано, как его увидят пользователи после публикации.")}
      </div>

      <TutorResumeCard
        tutor={preview as unknown as Record<string, unknown>}
        onContact={() => toast.info(t("dashboard.preview_contact_hint", "Это предпросмотр вашего резюме") as string)}
      />

      {status === "PENDING_MODERATION" && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
          {t("become_tutor.verification_hint", "Ваша заявка будет рассмотрена нашей командой.")}
        </p>
      )}
    </div>
  );
}