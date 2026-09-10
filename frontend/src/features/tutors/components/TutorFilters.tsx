import { useTranslation } from "react-i18next";
import { MARKETPLACE_CITIES, MARKETPLACE_SUBJECTS } from "../../../constants/cities";
import { TUTOR_TYPES } from "../../../constants/tutorTypes";
import { useState, useEffect } from "react";
import { subjectApi } from "../../subjects/api/subjectApi";

interface Props {
  filters: {
    subject: string;
    city: string;
    price_min: string;
    price_max: string;
    format: string;
    tutor_type: string;
    level: string;
  };
  onApply: (patch: Record<string, unknown>) => void;
  totalResults?: number;
}

const FORMATS = [
  { value: "", labelKey: "search.all", fallback: "Любой" },
  { value: "online", labelKey: "search.online", fallback: "Онлайн" },
  { value: "offline", labelKey: "search.offline", fallback: "Офлайн" },
];

const LEVELS = [
  { value: "", fallback: "Любой" },
  { value: "school", fallback: "Школьный" },
  { value: "university", fallback: "Вузовский" },
  { value: "beginner", fallback: "Начинающий" },
  { value: "advanced", fallback: "Продвинутый" },
  { value: "ort", fallback: "ОРТ" },
];

export default function TutorFilters({ filters, onApply }: Props) {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState(() => MARKETPLACE_SUBJECTS.map((s) => ({ value: s.value, label: s.labelRu, labelKey: s.labelKey })));

  useEffect(() => {
    let cancelled = false;
    void subjectApi.list().then((res) => {
      if (cancelled) return;
      if (res.values.length) {
        setSubjects(res.values.map((v) => ({ value: v.value, label: (v as unknown as Record<string, unknown>)["labelRu"] as string ?? v.value, labelKey: v.labelKey })));
      }
    });
    return () => { cancelled = true; };
  }, []);

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    fontSize: "var(--font-size-base)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    MozAppearance: "textfield" as unknown as string,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } input[type="number"] { -moz-appearance: textfield; }`}</style>
      <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>{t("search.filter_by", "Фильтры")}</h3>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("search.subject", "Предмет")}</span>
        <select
          value={filters.subject}
          onChange={(e) => onApply({ subject: e.target.value })}
          style={selectStyle}
          aria-label={t("search.subject", "Предмет")}
        >
          <option value="">{t("search.all_subjects", "Все предметы")}</option>
          {subjects.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.labelKey, s.label ?? s.value)}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("search.level", "Уровень")}</span>
        <select value={filters.level} onChange={(e) => onApply({ level: e.target.value })} style={selectStyle}>
          {LEVELS.map((l) => (
            <option key={l.value || "any"} value={l.value}>{l.fallback}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("profile.location", "Город")}</span>
        <select value={filters.city} onChange={(e) => onApply({ city: e.target.value })} style={selectStyle}>
          <option value="">{t("search.all", "Все города")}</option>
          {MARKETPLACE_CITIES.map((c) => (
            <option key={c.value} value={c.value}>{t(c.labelKey, c.labelRu)}</option>
          ))}
        </select>
      </label>

      <div>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, display: "block", marginBottom: 6 }}>{t("search.price", "Цена")} (KGS/час)</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t("search.price_min_placeholder", "Мин")}
            value={filters.price_min}
            onChange={(e) => onApply({ price_min: e.target.value.replace(/\D/g, "") })}
            style={inputStyle}
            aria-label={t("search.price_min", "Мин цена")}
          />
          <span>—</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t("search.price_max_placeholder", "Макс")}
            value={filters.price_max}
            onChange={(e) => onApply({ price_max: e.target.value.replace(/\D/g, "") })}
            style={inputStyle}
            aria-label={t("search.price_max", "Макс цена")}
          />
        </div>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("search.location_type", "Формат")}</span>
        <select value={filters.format} onChange={(e) => onApply({ format: e.target.value })} style={selectStyle}>
          {FORMATS.map((f) => (
            <option key={f.value || "any"} value={f.value}>{t(f.labelKey, f.fallback)}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("tutor_type.label", "Тип репетитора")}</span>
        <select value={filters.tutor_type} onChange={(e) => onApply({ tutor_type: e.target.value })} style={selectStyle}>
          <option value="">{t("search.all", "Любой")}</option>
          {TUTOR_TYPES.map((tt) => (
            <option key={tt.value} value={tt.value}>{t(tt.labelKey, tt.labelRu)}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
