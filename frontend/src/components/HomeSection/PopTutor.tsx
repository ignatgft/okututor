// Самые популярные репетиторы — marketplace версия (TutorProfile, не Course)
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/http";
import { tutors as tutorEndpoints } from "../../api/endpoints/users";
import TutorCard from "../../features/tutors/components/TutorCard";
import "../../styles/HomeSectionCSS/PopTutor.css";

interface TutorPopular {
  id: string;
  slug: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  shortDescription?: string;
  rating?: number;
  reviewsCount?: number;
  viewsCount?: number;
  priceFrom?: number;
  currency?: string;
  photoUrl?: string;
  city?: { nameRu?: string; slug?: string };
  subjects?: Array<{ nameRu?: string; slug?: string }>;
}

const PopTutor = () => {
  const { t } = useTranslation();
  const [tutors, setTutors] = useState<TutorPopular[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPopular = async () => {
      setIsLoading(true);
      setError("");
      try {
        // бизнес-логика на бэке: PUBLISHED, не просрочен, сорт views→rating→reviews→publishedAt, кэш 1 мин
        let res = await apiClient.get(tutorEndpoints.popular + "?limit=6", false);
        let data: unknown = res.data;
        let ok = res.response.ok;
        // fallback для старого бэка без /popular — берём обычный листинг с сортировкой
        if (!ok || !Array.isArray(data) && !(data as { content?: unknown })?.content) {
          const fb = await apiClient.get("/api/v1/tutors?size=6&sort=views_desc", false);
          if (fb.response.ok) {
            res = fb;
            data = fb.data;
            ok = true;
          }
        }
        if (!ok) throw new Error((data as { message?: string })?.message || "Failed to load");
        const list = Array.isArray(data) ? data : (data as { content?: unknown })?.content;
        const arr = Array.isArray(list) ? list : Array.isArray(data) ? data : [];
        if (!cancelled) setTutors(arr as TutorPopular[]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Failed to load popular tutors:", msg);
        if (!cancelled) setError(t("pop.error_loading", "Не удалось загрузить репетиторов"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPopular();
    return () => { cancelled = true; };
  }, [t]);

  if (error) {
    return (
      <section className="category-section inter">
        <div className="category-header">
          <span className="category-subtitle">{t("pop.subtitle", "Лучшие из лучших")}</span>
          <h2 className="category-title">{t("pop.title", "Самые популярные репетиторы на нашей платформе")}</h2>
        </div>
        <p className="error-message">{error}</p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
          {t("pop.error_hint", "Попробуйте обновить страницу или зайти позже.")}
        </p>
      </section>
    );
  }

  return (
    <section className="category-section inter">
      <div className="category-header">
        <span className="category-subtitle">{t("pop.subtitle", "Лучшие из лучших")}</span>
        <h2 className="category-title">{t("pop.title", "Самые популярные репетиторы на нашей платформе")}</h2>
      </div>

      {isLoading ? (
        <p>{t("pop.loading", "Загрузка...")}</p>
      ) : tutors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p>{t("pop.no_courses", "Пока нет популярных репетиторов")}</p>
          <Link to="/tutors" className="btn-primary" style={{ display: "inline-flex", marginTop: 12 }}>
            {t("pop.go_search", "Найти репетитора")}
          </Link>
        </div>
      ) : (
        <div className="category-grid">
          {tutors.slice(0, 6).map((tutor) => {
            // адаптируем TutorProfileResponse под TutorCard (ожидает snake_case / разные ключи)
            const cardTutor: Record<string, unknown> = {
              id: tutor.id,
              slug: tutor.slug,
              full_name: tutor.fullName,
              fullName: tutor.fullName,
              name: tutor.fullName,
              title: tutor.title,
              subject: tutor.subjects?.[0]?.nameRu || "",
              city: tutor.city?.nameRu || "",
              price: tutor.priceFrom,
              price_per_hour: tutor.priceFrom,
              currency: tutor.currency || "KGS",
              avatar: tutor.photoUrl,
              avatar_url: tutor.photoUrl,
              photoURL: tutor.photoUrl,
              bio: tutor.shortDescription,
              about: tutor.shortDescription,
              rating: tutor.rating,
              reviewsCount: tutor.reviewsCount,
              viewsCount: tutor.viewsCount,
            };
            return <TutorCard key={String(tutor.id)} tutor={cardTutor} />;
          })}
        </div>
      )}
    </section>
  );
};

export default PopTutor;
