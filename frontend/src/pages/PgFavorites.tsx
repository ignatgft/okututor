import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { usePageTitle } from "../components/pageTitleContext";
import { useFavorites } from "../hooks/useFavorites";
import TutorResumeCard from "../features/tutors/components/TutorResumeCard";
import { Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { useEffect } from "react";

export default function PgFavorites(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  useEffect(() => { setPageTitle(t("favorites.title", "Избранное") as string); }, [setPageTitle, t]);

  const { data: favorites, isLoading, isError, error, refetch } = useFavorites(true);

  if (isLoading) return <Spinner label={t("common.loading", "Загрузка...") as string} />;
  if (isError) return <ErrorState message={(error as Error)?.message || t("common.error", "Ошибка") as string} onRetry={() => void refetch()} />;

  if (!favorites || favorites.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{t("favorites.title", "Избранное")}</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>{t("favorites.empty_hint", "Здесь появятся репетиторы, которых вы добавили в избранное.")}</p>
        <EmptyState
          icon=""
          title={t("favorites.empty", "Пока пусто") as string}
          hint={t("favorites.empty_hint2", "Нажмите  на карточке репетитора, чтобы сохранить.") as string}
          action={<Link to="/tutors" className="btn-primary" style={{ textDecoration: "none" }}>{t("favorites.find_tutors", "Найти репетитора")}</Link>}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: "calc(var(--bottom-nav-height,64px) + 16px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t("favorites.title", "Избранное")} <span style={{ fontWeight: 400, color: "var(--color-text-muted)", fontSize: 16 }}>· {favorites.length}</span></h2>
        <Link to="/tutors" className="btn-secondary" style={{ textDecoration: "none", fontSize: 13 }}>{t("favorites.find_tutors", "Найти репетитора")}</Link>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {favorites.map((tutor) => (
          <TutorResumeCard key={String(tutor["id"] ?? "")} tutor={tutor as Record<string, unknown>} />
        ))}
      </div>
    </div>
  );
}
