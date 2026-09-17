// Marketplace hero — §6 Homepage: "Найдите репетитора в Кыргызстане" + [Предмет][Город][Найти]
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MARKETPLACE_CITIES } from "../../constants/cities";
import { subjectApi } from "../../features/subjects/api/subjectApi";
import "../../styles/HomeSectionCSS/HeroSection.css";

export default function MarketplaceHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [city, setCity] = useState("");
  const [subjects, setSubjects] = useState<{ value: string; label: string; labelKey: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    void subjectApi.list().then((res) => {
      if (cancelled) return;
      setSubjects(res.values.map((v) => ({ value: String(v.value), label: (v as unknown as Record<string, unknown>)["labelRu"] as string ?? String(v.value), labelKey: v.labelKey })));
    });
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (city) params.set("city", city);
    // support both /tutors and /search (legacy)
    navigate(`/tutors?${params.toString()}`);
  };

  return (
    <section className="hero-section" style={{ background: "var(--color-surface)", paddingBottom: "var(--space-10)" }}>
      <div className="hero-container" style={{ flexDirection: "column", alignItems: "stretch", textAlign: "left", maxWidth: "720px" }}>
        <div className="hero-content" style={{ maxWidth: "100%" }}>
          <h1 className="hero-title" style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)", lineHeight: 1.15, marginBottom: "var(--space-3)" }}>
            {t("marketplace.hero_title", "Найдите репетитора в Кыргызстане")}
          </h1>
          <p className="hero-subtitle" style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)" }}>
            {t("marketplace.hero_subtitle", "Математика, английский, ОРТ, Python — выберите предмет и город, начните уже сегодня")}
          </p>

          <form onSubmit={handleSearch} aria-label={t("marketplace.search_aria", "Поиск репетитора")} className="marketplace-hero-form" style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 12, boxShadow: "var(--shadow-sm)" }}>
            <div className="marketplace-hero-grid" style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-secondary)" }}>{t("marketplace.subject_label", "Предмет")}</span>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ padding: "12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: "var(--font-size-base)", minHeight: 44 }}
                  aria-label={t("marketplace.subject_label", "Предмет")}
                >
                  <option value="">{t("search.all_subjects", "Все предметы")}</option>
                  {subjects.map((s) => (
                    <option key={s.value} value={s.label ?? s.value}>{t(s.labelKey, s.label ?? s.value)}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-secondary)" }}>{t("profile.location", "Город")}</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ padding: "12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: "var(--font-size-base)", minHeight: 44 }}
                  aria-label={t("profile.location", "Город")}
                >
                  <option value="">{t("search.all", "Все города")}</option>
                  {MARKETPLACE_CITIES.map((c) => (
                    <option key={c.value} value={c.labelRu}>{t(c.labelKey, c.labelRu)}</option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", minHeight: 48, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
              {t("marketplace.find_tutor", "Найти репетитора")}
            </button>
          </form>

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/become-tutor")}
              style={{ flex: "1 1 auto", minHeight: 44 }}
            >
              {t("marketplace.become_tutor_cta", "Разместить своё резюме")}
            </button>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
              {t("marketplace.become_hint", "Ты студент? Хорошо знаешь предмет? Найди учеников.")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
