import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Spinner, ErrorState, EmptyState } from "../components/ui/Primitives";
import { shareApi, type ShareViewResponse } from "../api/share.api";
import TutorResumeCard from "../features/tutors/components/TutorResumeCard";

export default function PgShare(): JSX.Element {
  const { token } = useParams() as { token?: string };
  const { t } = useTranslation();
  const [data, setData] = useState<ShareViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("share.not_found", "Ссылка не найдена") as string);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setExpired(false);
      try {
        const res = await shareApi.byToken(token);
        if (cancelled) return;
        if (res.response.ok) {
          setData(res.data as ShareViewResponse);
          const name = String((res.data as ShareViewResponse).resume?.["fullName"] ?? (res.data as ShareViewResponse).resume?.["firstName"] ?? "") || t("share.default_title", "Резюме репетитора");
          document.title = `${name} — OkuTutor`;
          return;
        }
        if (res.response.status === 410) {
          setExpired(true);
          setError(t("share.expired", "Ссылка устарела") as string);
        } else {
          setError((res.data as Record<string, unknown>)?.["message"] as string ?? t("share.not_found", "Ссылка не найдена") as string);
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
  }, [token, t]);

  if (loading) return <Spinner label={t("common.loading", "Загрузка...") as string} />;

  if (error || !data) {
    return (
      <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
        <EmptyState
          icon={<Share2 size={32} />}
          title={error}
          hint={expired ? t("share.expired_hint", "Владелец резюме может создать новую ссылку.") : undefined}
          action={<Link to="/tutors" className="btn-primary" style={{ textDecoration: "none" }}>{t("dashboard.find_tutors", "Найти репетитора")}</Link>}
        />
      </div>
    );
  }

  const views = data.share?.viewCount ?? 0;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1000, margin: "0 auto", padding: "16px 0", width: "100%" }}>
      <div
        style={{
          padding: "var(--space-3)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-primary-soft, #EEF2FF)",
          border: "1px solid var(--color-primary, #3563E9)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text)",
          lineHeight: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Share2 size={16} />
        {t("share.shared_view", "Вам поделились резюме репетитора")}
        {views > 1 && <span style={{ marginLeft: "auto", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>{t("share.views", "{{count}} переходов", { count: views })}</span>}
      </div>
      <TutorResumeCard tutor={data.resume} />
      <div style={{ textAlign: "center" }}>
        <Link to="/tutors" className="btn-ghost" style={{ textDecoration: "none" }}>{t("dashboard.find_tutors", "Найти репетитора")}</Link>
      </div>
    </div>
  );
}