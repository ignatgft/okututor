// Marketplace Tutor Listing — §8 (§6 UX: Search → Listing → Profile → Contact)
import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TutorResumeCard from "../features/tutors/components/TutorResumeCard";
import TutorFilters from "../features/tutors/components/TutorFilters";
import { useTutorSearch } from "../features/search/hooks/useTutorSearch";
import Pagination from "../components/ui/Pagination";
import { Spinner, ErrorState, EmptyState } from "../components/ui/Primitives";
import { tutorSlug } from "../utils/slug";

export default function PgTutors() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const {
    tutors, searchQuery, error, loading, totalPages, totalResults, filters, handlers,
  } = useTutorSearch(20);

  const hasActiveFilters = useMemo(() =>
    Boolean(filters.subject || filters.city || filters.price_min || filters.price_max || filters.format || filters.tutor_type || filters.level || searchQuery.trim())
  , [filters, searchQuery]);

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (filters.subject) activeChips.push({ label: `Предмет: ${filters.subject}`, onClear: () => handlers.applyFilters({ subject: "" }) });
  if (filters.city) activeChips.push({ label: `Город: ${filters.city}`, onClear: () => handlers.applyFilters({ city: "" }) });
  if (filters.format) activeChips.push({ label: `Формат: ${filters.format}`, onClear: () => handlers.applyFilters({ format: "" }) });
  if (filters.tutor_type) activeChips.push({ label: `Тип: ${filters.tutor_type}`, onClear: () => handlers.applyFilters({ tutor_type: "" }) });
  if (filters.level) activeChips.push({ label: `Уровень: ${filters.level}`, onClear: () => handlers.applyFilters({ level: "" }) });
  if (searchQuery.trim()) activeChips.push({ label: `Поиск: ${searchQuery.trim()}`, onClear: () => handlers.setSearchQuery("") });

  const resetAll = () => {
    handlers.setSearchQuery("");
    handlers.applyFilters({ subject: "", city: "", price_min: "", price_max: "", format: "", tutor_type: "", level: "", page: 0 });
  };

  const qs = location.search || "";

  return (
    <>
      <Navbar />
      <main id="main-content" className="search-page-container" style={{ paddingTop: "var(--header-height, 64px)" }}>
        <section className="search-hero" style={{ paddingBottom: 8 }}>
          <h1>{t("marketplace.list_title", "Репетиторы в Кыргызстане")}</h1>
          <p>{t("marketplace.list_subtitle", "Найдите преподавателя по предмету, городу, формату и типу репетитора")}</p>
        </section>

        {/* Search + filters — sticky to header (mobile + desktop) */}
        <div className="marketplace-search-sticky">
          <form onSubmit={handlers.handleSearchSubmit} style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 8 }}>
            <input
              type="search"
              value={searchQuery}
              onChange={handlers.handleSearchChange}
              placeholder={t("marketplace.search_placeholder", "математика, англ, питон, ОРТ...")}
              aria-label={t("common.search", "Поиск")}
              style={{ flex: 1, minHeight: 44 }}
            />
            <button type="submit" className="btn-primary" style={{ minHeight: 44, whiteSpace: "nowrap" }}>
              {t("common.search", "Поиск")}
            </button>
            <button
              type="button"
              className="btn-secondary tutors-mobile-filter-btn"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              style={{ minHeight: 44 }}
            >
              {t("search.filters", "Фильтры")}
            </button>
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
            <div className="mobile-filters-overlay open" style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex" }}>
              <div className="mobile-filters-backdrop" onClick={() => setMobileFiltersOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
              <aside style={{ position: "relative", background: "var(--color-surface)", width: "min(85vw, 340px)", maxHeight: "100dvh", overflowY: "auto", padding: 16, boxShadow: "var(--shadow-lg)" }}>
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
                icon="🔍"
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
