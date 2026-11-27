// Marketplace Tutor Listing — §8 (§6 UX: Search → Listing → Profile → Contact)
import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TutorResumeCard from "../features/tutors/components/TutorResumeCard";
import TutorFilters from "../features/tutors/components/TutorFilters";
import { useTutorSearch } from "../features/search/hooks/useTutorSearch";
import Pagination from "../components/ui/Pagination";
import { Spinner, ErrorState, EmptyState } from "../components/ui/Primitives";
import { trackEvent } from "../utils/analytics";
import { MARKETPLACE_SUBJECTS, MARKETPLACE_CITIES } from "../constants/cities";
import { tutorTypeLabel } from "../constants/tutorTypes";

const LEVEL_LABEL_KEYS: Record<string, string> = {
  school: "search.level_school",
  university: "search.level_university",
  beginner: "search.level_beginner",
  advanced: "search.level_advanced",
  ort: "search.level_ort",
};

export default function PgTutors() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const {
    tutors, searchQuery, error, loading, totalPages, totalResults, filters, handlers,
  } = useTutorSearch(20);

  const hasActiveFilters = useMemo(() =>
    Boolean(filters.subject || filters.city || filters.price_min || filters.price_max || filters.format || filters.tutor_type || filters.level || searchQuery.trim())
  , [filters, searchQuery]);

  const getSubjectLabel = (v: string) => {
    const s = MARKETPLACE_SUBJECTS.find((x) => x.value === v);
    return s ? (t(s.labelKey, s.labelRu) as string) : v;
  };
  const getCityLabel = (v: string) => {
    const c = MARKETPLACE_CITIES.find((x) => x.value === v);
    return c ? (t(c.labelKey, c.labelRu) as string) : v;
  };
  const getFormatLabel = (v: string) => {
    if (v === "online") return t("search.online", "Онлайн") as string;
    if (v === "offline") return t("search.offline", "Офлайн") as string;
    return v;
  };
  const getLevelLabel = (v: string) => {
    const key = LEVEL_LABEL_KEYS[v];
    return key ? (t(key, v) as string) : v;
  };
  const activeChips: { label: string; onClear: () => void }[] = [];
  if (filters.subject) activeChips.push({ label: t("search.chip_subject", "Предмет: {{value}}", { value: getSubjectLabel(filters.subject) }) as string, onClear: () => handlers.applyFilters({ subject: "" }) });
  if (filters.city) activeChips.push({ label: t("search.chip_city", "Город: {{value}}", { value: getCityLabel(filters.city) }) as string, onClear: () => handlers.applyFilters({ city: "" }) });
  if (filters.format) activeChips.push({ label: t("search.chip_format", "Формат: {{value}}", { value: getFormatLabel(filters.format) }) as string, onClear: () => handlers.applyFilters({ format: "" }) });
  if (filters.tutor_type) activeChips.push({ label: t("search.chip_type", "Тип: {{value}}", { value: tutorTypeLabel(filters.tutor_type, (k, fb) => t(k, fb) as string) || filters.tutor_type }) as string, onClear: () => handlers.applyFilters({ tutor_type: "" }) });
  if (filters.level) activeChips.push({ label: t("search.chip_level", "Уровень: {{value}}", { value: getLevelLabel(filters.level) }) as string, onClear: () => handlers.applyFilters({ level: "" }) });
  if (searchQuery.trim()) activeChips.push({ label: t("search.chip_query", "Поиск: {{value}}", { value: searchQuery.trim() }) as string, onClear: () => handlers.setSearchQuery("") });

  const resetAll = () => {
    handlers.setSearchQuery("");
    handlers.applyFilters({ subject: "", city: "", price_min: "", price_max: "", format: "", tutor_type: "", level: "", page: 0 });
  };

  const qs = location.search || "";

  return (
    <>
      <main id="main-content" className="search-page-container" style={{ paddingTop: 16 }}>
        <section className="search-hero" style={{ paddingBottom: 8 }}>
          <h1>{t("marketplace.list_title", "Репетиторы в Кыргызстане")}</h1>
          <p>{t("marketplace.list_subtitle", "Найдите преподавателя по предмету, городу, формату и типу репетитора")}</p>
        </section>

        {/* Search + filters — sticky to header (mobile + desktop) — исправлено для моб. верстки */}
        <div className="marketplace-search-sticky">
          <form onSubmit={(e) => { handlers.handleSearchSubmit(e); if (searchQuery.trim()) trackEvent("search", { search_term: searchQuery.trim() }); }} style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="search"
              value={searchQuery}
              onChange={handlers.handleSearchChange}
              placeholder={t("marketplace.search_placeholder", "математика, англ, питон...")}
              aria-label={t("common.search", "Поиск")}
              style={{ flex: "1 1 220px", minWidth: 0, minHeight: 44 }}
            />
            <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
              <button type="submit" className="btn-primary" style={{ minHeight: 44, whiteSpace: "nowrap", flex: "1 1 auto" }}>
                {t("common.search", "Поиск")}
              </button>
              <button
                type="button"
                className="btn-secondary tutors-mobile-filter-btn"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                aria-expanded={mobileFiltersOpen}
                style={{ minHeight: 44, whiteSpace: "nowrap", flex: "1 1 auto" }}
              >
                {t("search.filters", "Фильтры")}
              </button>
            </div>
          </form>
          {/* Active filters — also sticky */}
          {activeChips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 720, margin: "12px auto 0", alignItems: "center" }}>
              {activeChips.map((chip, idx) => (
                <span key={idx} className="badge badge-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px" }}>
                  {chip.label}
                  <button type="button" onClick={chip.onClear} aria-label={t("common.close", "Закрыть")} style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>×</button>
                </span>
              ))}
              <button type="button" className="btn-ghost" onClick={resetAll} style={{ fontSize: "var(--font-size-sm)" }}>{t("search.reset_all", "Сбросить всё")}</button>
            </div>
          )}
        </div>

        {/* Results header */}
        {!loading && !error && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 var(--page-padding,16px)", maxWidth: 1440, margin: "12px auto 0", flexWrap: "wrap", gap: 8 }}>
            <span className="search-result-count" style={{ margin: 0 }}>
              {!qs && tutors.length === 0 ? "" : t("search.results_count", "{{count}} результатов", { count: totalResults })}
            </span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
              {t("marketplace.search_hint", "Поддержка: математика / матем / питон / python / англ / ОРТ")}
            </span>
          </div>
        )}

        <div className="tutors-layout">
          {/* Desktop filters */}
          <aside className="tutors-filters-desktop" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: 16, alignSelf: "start", position: "sticky", top: "calc(var(--header-height,64px) + 16px)" }}>
            <TutorFilters filters={filters} onApply={(patch) => handlers.applyFilters(patch as never)} totalResults={totalResults} />
            {hasActiveFilters && (
              <button type="button" className="btn-secondary" onClick={resetAll} style={{ width: "100%", marginTop: 16 }}>
                {t("search.reset_all", "Сбросить всё")}
              </button>
            )}
          </aside>

          {/* Mobile overlay */}
          {mobileFiltersOpen && (
            <div className="mobile-filters-overlay open" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "stretch", backdropFilter: "none" }}>
              <div className="mobile-filters-backdrop" onClick={() => setMobileFiltersOpen(false)} style={{ position: "absolute", inset: 0, background: "var(--color-overlay, rgba(16,23,39,0.5))", backdropFilter: "none" }} />
              <aside style={{ position: "relative", zIndex: 1, background: "var(--color-surface)", backdropFilter: "none", WebkitBackdropFilter: "none", isolation: "isolate", width: "min(85vw, 340px)", maxHeight: "100dvh", overflowY: "auto", padding: 16, boxShadow: "var(--shadow-xl)", borderRight: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>{t("search.filter_by", "Фильтры")}</h3>
                  <button type="button" className="btn-ghost" onClick={() => setMobileFiltersOpen(false)} aria-label={t("common.close", "Закрыть")}>✕</button>
                </div>
                <TutorFilters filters={filters} onApply={(patch) => handlers.applyFilters(patch as never)} />
                <button type="button" className="btn-secondary" onClick={() => { resetAll(); setMobileFiltersOpen(false); }} style={{ width: "100%", marginTop: 16 }}>
                  {t("search.reset_all", "Сбросить всё")}
                </button>
              </aside>
            </div>
          )}

          {/* Results */}
          <section style={{ minWidth: 0 }}>
            {loading && <Spinner label={t("search.loading", "Загрузка...")} />}
            {!loading && error && <ErrorState message={error} onRetry={() => handlers.handlePageChange(filters.page)} />}
            {!loading && !error && tutors.length === 0 && (
              <EmptyState
                icon=""
                title={t("search.no_courses", "Не нашли подходящего репетитора")}
                hint={
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                    <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{t("marketplace.no_results_hint", "Попробуйте изменить предмет, город или формат.")}</p>
                    {hasActiveFilters && <button type="button" className="btn-secondary" onClick={resetAll}>{t("search.reset_all", "Сбросить всё")}</button>}
                  </div>
                }
              />
            )}

            {!loading && tutors.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "100%", width: "100%" }}>
                {tutors.map((tutor) => {
                  const tRec = tutor as unknown as Record<string, unknown>;
                  return <TutorResumeCard key={String(tRec["id"])} tutor={tRec} />;
                })}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div style={{ marginTop: 24 }}>
                <Pagination page={filters.page} totalPages={totalPages} onChange={handlers.handlePageChange} />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
