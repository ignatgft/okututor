import { useTranslation } from "react-i18next";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function getVisiblePages(page: number, totalPages: number): (number | string)[] {
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
  const result: (number | string)[] = [];
  if (range[0] > 0) {
    result.push(0);
    if (range[0] > 1) result.push("...");
  }
  result.push(...range);
  if (range[range.length - 1] < totalPages - 1) {
    if (range[range.length - 1] < totalPages - 2) result.push("...");
    result.push(totalPages - 1);
  }
  return result;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!totalPages || totalPages <= 1) return null;

  const pages = getVisiblePages(page, totalPages);

  return (
    <nav
      className="pagination"
      aria-label={t("common.pagination", "Pagination")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 24,
        padding: "16px 0",
        borderTop: "1px solid var(--color-border-light, #e5e7eb)",
      }}
    >
      <button
        type="button"
        className="pagination-btn"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        style={{
          padding: "8px 14px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--color-border)",
          background: page === 0 ? "var(--color-bg-secondary)" : "var(--color-surface)",
          color: page === 0 ? "var(--color-text-muted)" : "var(--color-text)",
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          cursor: page === 0 ? "not-allowed" : "pointer",
          opacity: page === 0 ? 0.6 : 1,
          minHeight: 36,
        }}
      >
        ← {t("search.prev", "Назад")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination-btn ${p === page ? "active" : ""}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onChange(p as number)}
              style={{
                minWidth: 36,
                height: 36,
                padding: "0 10px",
                borderRadius: "var(--radius-full)",
                border: p === page ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: p === page ? "var(--color-primary)" : "var(--color-surface)",
                color: p === page ? "#fff" : "var(--color-text)",
                fontSize: "var(--font-size-sm)",
                fontWeight: p === page ? 700 : 500,
                cursor: "pointer",
                boxShadow: p === page ? "var(--shadow-sm)" : "none",
                transition: "all 0.15s",
              }}
            >
              {(p as number) + 1}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className="pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        style={{
          padding: "8px 14px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--color-border)",
          background: page >= totalPages - 1 ? "var(--color-bg-secondary)" : "var(--color-primary)",
          color: page >= totalPages - 1 ? "var(--color-text-muted)" : "#fff",
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
          opacity: page >= totalPages - 1 ? 0.6 : 1,
          minHeight: 36,
        }}
      >
        {t("search.next", "Далее")} →
      </button>
    </nav>
  );
}
