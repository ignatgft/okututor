// Marketplace subject grid — §7 (API-first with fallback) + §8 homepage listing
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { subjectApi } from "../../features/subjects/api/subjectApi";
import "../../styles/HomeSectionCSS/Category.css";

const FALLBACK_ICON: Record<string, string> = {
  matematika: "∑",
  angliyskiy: "A",
  russkiy: "Я",
  kyrgyzskiy: "К",
  fizika: "⚛",
  himiya: "🧪",
  biologiya: "🧬",
  informatika: "💻",
  python: "🐍",
  ort: "🎓",
};

export default function SubjectGrid() {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<{ value: string; label: string; labelKey: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void subjectApi.list().then((res) => {
      if (cancelled) return;
      const mapped = res.values.slice(0, 10).map((v) => ({
        value: String(v.value),
        label: (v as unknown as Record<string, unknown>)["labelRu"] as string ?? String(v.value),
        labelKey: v.labelKey,
      }));
      setSubjects(mapped);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="category-section inter" aria-busy="true">
        <div className="category-header">
          <span className="category-subtitle">{t("categories.subtitle", "Репетиторы по предметам")}</span>
          <h2 className="category-title">{t("categories.title", "Популярные предметы")}</h2>
        </div>
        <div className="category-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="category-card" style={{ opacity: 0.6 }}>
              <div className="category-icon" style={{ background: "var(--color-bg-secondary)" }} />
              <div className="skeleton" style={{ height: 16, width: "60%", margin: "8px auto" }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="category-section inter" id="subjects">
      <div className="category-header">
        <span className="category-subtitle">{t("categories.subtitle", "Репетиторы по предметам")}</span>
        <h2 className="category-title">{t("categories.title", "Выберите предмет")}</h2>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 8, fontSize: "var(--font-size-sm)" }}>
          {t("marketplace.subjects_hint", "Все предметы — из каталога. Список управляется через API.")}
        </p>
      </div>
      <div className="category-grid">
        {subjects.map((s) => {
          const icon = FALLBACK_ICON[s.value] ?? s.label.charAt(0).toUpperCase();
          const label = t(s.labelKey, s.label);
          return (
            <Link
              key={s.value}
              to={`/tutors?subject=${encodeURIComponent(s.label)}`}
              className="category-card"
              aria-label={label}
            >
              <div className="category-icon" aria-hidden="true" style={{ fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
              </div>
              <h3 className="category-card-title">{label}</h3>
              <span className="category-card-link">{t("categories.show_more", "показать больше")}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
