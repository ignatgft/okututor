import { useTranslation } from "react-i18next";
import { MARKETPLACE_CITIES, MARKETPLACE_SUBJECTS } from "../../../constants/cities";
import { TUTOR_TYPES } from "../../../constants/tutorTypes";
import { useState, useEffect, useMemo } from "react";
import { subjectApi } from "../../subjects/api/subjectApi";
import CustomSelect, { CustomSelectOption } from "../../../components/ui/CustomSelect";

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

  const subjectOptions: CustomSelectOption[] = useMemo(() => [
    { value: "", label: t("search.all_subjects", "Все предметы") },
    ...subjects.map((s) => ({ value: s.value, label: t(s.labelKey, s.label ?? s.value) })),
  ], [subjects, t]);

  const levelOptions: CustomSelectOption[] = useMemo(() =>
    LEVELS.map((l) => ({ value: l.value, label: l.fallback })),
  []);

  const cityOptions: CustomSelectOption[] = useMemo(() => [
    { value: "", label: t("search.all_cities", "Все города") },
    ...MARKETPLACE_CITIES.map((c) => ({ value: c.value, label: t(c.labelKey, c.labelRu) })),
  ], [t]);

  const formatOptions: CustomSelectOption[] = useMemo(() =>
    FORMATS.map((f) => ({ value: f.value, label: t(f.labelKey, f.fallback) })),
  [t]);

  const tutorTypeOptions: CustomSelectOption[] = useMemo(() => [
    { value: "", label: t("search.all", "Любой") },
    ...TUTOR_TYPES.map((tt) => ({ value: tt.value, label: t(tt.labelKey, tt.labelRu) })),
  ], [t]);

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
      <style>{`input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } input[type="number"] { -moz-appearance: textfield; } .tutor-filters-title{font-size:var(--font-size-lg);font-weight:600;margin:0} @media(max-width:767px){.tutor-filters-title{display:none}}`}</style>
      <h3 className="tutor-filters-title" style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>{t("search.filter_by", "Фильтры")}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("search.subject", "Предмет")}</span>
        <CustomSelect
          value={filters.subject}
          onChange={(val) => onApply({ subject: val })}
          options={subjectOptions}
          placeholder={t("search.all_subjects", "Все предметы")}
          ariaLabel={t("search.subject", "Предмет")}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("search.level", "Уровень")}</span>
        <CustomSelect
          value={filters.level}
          onChange={(val) => onApply({ level: val })}
          options={levelOptions}
          placeholder={t("search.all", "Любой")}
          ariaLabel={t("search.level", "Уровень")}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("profile.location", "Город")}</span>
        <CustomSelect
          value={filters.city}
          onChange={(val) => onApply({ city: val })}
          options={cityOptions}
          placeholder={t("search.all_cities", "Все города")}
          ariaLabel={t("profile.location", "Город")}
        />
      </div>

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

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("search.location_type", "Формат")}</span>
        <CustomSelect
          value={filters.format}
          onChange={(val) => onApply({ format: val })}
          options={formatOptions}
          placeholder={t("search.all", "Любой")}
          ariaLabel={t("search.location_type", "Формат")}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{t("tutor_type.label", "Тип репетитора")}</span>
        <CustomSelect
          value={filters.tutor_type}
          onChange={(val) => onApply({ tutor_type: val })}
          options={tutorTypeOptions}
          placeholder={t("search.all", "Любой")}
          ariaLabel={t("tutor_type.label", "Тип репетитора")}
        />
      </div>
    </div>
  );
}
