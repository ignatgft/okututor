import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import TutorResumeCard from "../features/tutors/components/TutorResumeCard";
import TutorFilters from "../features/tutors/components/TutorFilters";
import { useTutorSearch } from "../features/search/hooks/useTutorSearch";
import Pagination from "../components/ui/Pagination";
import { Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { trackEvent } from "../utils/analytics";
import { MARKETPLACE_SUBJECTS, MARKETPLACE_CITIES } from "../constants/cities";

export default function PgUserDashboard(): JSX.Element {
  const { t } = useTranslation();
  usePageTitle();
  const [activeTab, setActiveTab] = useState<"all" | "online" | "offline">("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    tutors, searchQuery, error, loading, totalPages, totalResults, filters, handlers,
  } = useTutorSearch(20);

  const hasActiveFilters = useMemo(() =>
    Boolean(filters.subject || filters.city || filters.price_min || filters.price_max || filters.format || filters.tutor_type || filters.level || searchQuery.trim())
  , [filters, searchQuery]);

  const activeFilterCount = useMemo(() =>
    [filters.subject, filters.city, filters.price_min, filters.price_max, filters.format, filters.tutor_type, filters.level].filter(Boolean).length
  , [filters]);

  const handleTab = (tab: "all" | "online" | "offline") => {
    setActiveTab(tab);
    if (tab === "all") handlers.applyFilters({ format: "" });
    if (tab === "online") handlers.applyFilters({ format: "online" });
    if (tab === "offline") handlers.applyFilters({ format: "offline" });
  };

  const getSubjectLabel = (v: string) => MARKETPLACE_SUBJECTS.find((s) => s.value === v)?.labelRu ?? v;
  const getCityLabel = (v: string) => MARKETPLACE_CITIES.find((c) => c.value === v)?.labelRu ?? v;
  const activeChips: { label: string; onClear: () => void }[] = [];
  if (filters.subject) activeChips.push({ label: `Предмет: ${getSubjectLabel(filters.subject)}`, onClear: () => handlers.applyFilters({ subject: "" }) });
  if (filters.city) activeChips.push({ label: `Город: ${getCityLabel(filters.city)}`, onClear: () => handlers.applyFilters({ city: "" }) });
  if (filters.format) activeChips.push({ label: `Формат: ${filters.format}`, onClear: () => handlers.applyFilters({ format: "" }) });
  if (filters.tutor_type) activeChips.push({ label: `Тип: ${filters.tutor_type}`, onClear: () => handlers.applyFilters({ tutor_type: "" }) });
  if (filters.level) activeChips.push({ label: `Уровень: ${filters.level}`, onClear: () => handlers.applyFilters({ level: "" }) });
  if (searchQuery.trim()) activeChips.push({ label: `Поиск: ${searchQuery.trim()}`, onClear: () => handlers.setSearchQuery("") });

  const resetAll = () => {
    handlers.setSearchQuery("");
    handlers.applyFilters({ subject: "", city: "", price_min: "", price_max: "", format: "", tutor_type: "", level: "", page: 0 });
    setActiveTab("all");
    setFilterOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlers.handleSearchSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    if (searchQuery.trim()) trackEvent("search", { search_term: searchQuery.trim() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: "calc(var(--bottom-nav-height,64px) + 16px)" }}>
      {/* Sticky search header */}
      <div className="tutors-sticky-header" style={{ position: "sticky", top: 56, zIndex: 8, background: "var(--color-background, #f8fafc)", margin: "0 -16px", padding: "10px 16px 10px", borderBottom: "1px solid var(--color-border, #e5e7eb)", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {[
            { id: "all", label: "Все" },
            { id: "online", label: "Онлайн" },
            { id: "offline", label: "Очно" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTab(tab.id as never)}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: activeTab === tab.id ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: activeTab === tab.id ? "var(--color-primary)" : "var(--color-surface)",
                color: activeTab === tab.id ? "#fff" : "var(--color-text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search row — sticky convenient */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 720, width: "100%" }}>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
            <input
              type="search"
              value={searchQuery}
              onChange={handlers.handleSearchChange}
              placeholder={t("marketplace.search_placeholder", "математика, англ, питон, ОРТ...") as string}
              aria-label={t("common.search", "Поиск") as string}
              style={{ width: "100%", minHeight: 44, padding: "10px 36px 10px 14px", borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 16 }}
            />
            {searchQuery.trim() && (
              <button type="button" onClick={() => handlers.setSearchQuery("")} aria-label="clear" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "var(--color-bg-secondary)", border: "none", borderRadius: 9999, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-muted)" }}>×</button>
            )}
          </div>
          <button type="submit" className="btn-primary" style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, whiteSpace: "nowrap", fontWeight: 700, flexShrink: 0 }}>
            {t("common.search", "Поиск")}
          </button>
          {/* Mobile filter trigger */}
          <button type="button" className="tutors-filter-mobile-btn" onClick={() => setFilterOpen(true)} style={{ display: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--color-border)", background: hasActiveFilters ? "var(--color-primary)" : "var(--color-surface)", color: hasActiveFilters ? "#fff" : "var(--color-text)", fontWeight: 600, flexShrink: 0, position: "relative" }}>
            Фильтры{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </button>
        </form>

        {activeChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {activeChips.map((chip, idx) => (
              <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 9999, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", fontSize: 13 }}>
                {chip.label}
                <button type="button" onClick={chip.onClear} style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>×</button>
              </span>
            ))}
            <button type="button" className="btn-ghost" onClick={resetAll} style={{ fontSize: 13 }}>{t("search.reset_all", "Сбросить всё")}</button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 13, color: "var(--color-text-muted)" }}>
          <span>{totalResults} результатов</span>
          <span className="tutors-support-hint" style={{ fontSize: 12 }}>Поддержка: математика / матем / питон / python / англ / ОРТ</span>
        </div>
      </div>

      <div className="tutors-layout" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start", marginTop: 14 }}>
        <aside className="tutors-filters-desktop" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 16, position: "sticky", top: 132, display: "block", alignSelf: "start" }}>
          <TutorFilters filters={filters} onApply={(patch) => handlers.applyFilters(patch as never)} totalResults={totalResults} />
        </aside>
        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && <Spinner label={t("search.loading", "Загрузка...") as string} />}
          {!loading && error && <ErrorState message={error} onRetry={() => handlers.handlePageChange(filters.page)} />}
          {!loading && !error && tutors.length === 0 && (
            <EmptyState title={t("search.no_courses", "Не нашли подходящего репетитора") as string} hint={<div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}><p style={{ margin: 0, color: "var(--color-text-muted)" }}>{t("marketplace.no_results_hint", "Попробуйте изменить предмет, город или формат.")}</p><button type="button" className="btn-secondary" onClick={resetAll}>{t("search.reset_all", "Сбросить всё")}</button></div>} />
          )}
          {!loading && tutors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tutors.map((tutor) => {
                const tRec = tutor as unknown as Record<string, unknown>;
                return <TutorResumeCard key={String(tRec["id"])} tutor={tRec} />;
              })}
            </div>
          )}
          {!loading && totalPages > 1 && (
            <div style={{ marginTop: 8 }}>
              <Pagination page={filters.page} totalPages={totalPages} onChange={handlers.handlePageChange} />
            </div>
          )}
        </section>
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <>
          <div onClick={() => setFilterOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50 }} aria-hidden="true" />
          <div role="dialog" aria-modal="true" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 51, background: "var(--color-surface, #fff)", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88dvh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Фильтры{activeFilterCount ? ` · ${activeFilterCount}` : ""}</h3>
              <button type="button" onClick={() => setFilterOpen(false)} style={{ width: 36, height: 36, borderRadius: 9999, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, WebkitOverflowScrolling: "touch" }}>
              <TutorFilters filters={filters} onApply={(patch) => handlers.applyFilters(patch as never)} totalResults={totalResults} />
            </div>
            <div style={{ padding: 16, borderTop: "1px solid var(--color-border)", display: "flex", gap: 8, flexShrink: 0, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
              <button type="button" className="btn-ghost" onClick={resetAll} style={{ flex: 1, minHeight: 44 }}>Сбросить</button>
              <button type="button" className="btn-primary" onClick={() => setFilterOpen(false)} style={{ flex: 2, minHeight: 44 }}>Показать · {totalResults}</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 767px){
          .tutors-layout{grid-template-columns:1fr !important}
          .tutors-filters-desktop{display:none !important}
          .tutors-filter-mobile-btn{display:inline-flex !important; align-items:center; justify-content:center}
          .tutors-sticky-header{top:56px !important; margin: 0 -16px !important; padding-left:16px !important; padding-right:16px !important}
          .tutors-support-hint{display:none !important}
        }
        @media (min-width: 768px){
          .tutors-filter-mobile-btn{display:none !important}
        }
      `}</style>
    </div>
  );
}
