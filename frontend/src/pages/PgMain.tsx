import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SubjectIcon from "../components/ui/SubjectIcon";

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  labelId: string;
}

function CustomSelectField({ label, value, options, onChange, labelId }: SelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, optValue: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(optValue);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="field">
      <label id={labelId}>{label}</label>
      <div className="select" ref={containerRef}>
        <button
          type="button"
          className="select-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={labelId}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span>{selectedOption.label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen && (
          <ul className="select-list" role="listbox" aria-labelledby={labelId}>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  className="select-option"
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, opt.value)}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const CATEGORIES = [
  { name: "Математика", subject: "Математика", key: "math" },
  { name: "Английский", subject: "Английский", key: "english" },
  { name: "Русский", subject: "Русский", key: "russian" },
  { name: "Кыргызский", subject: "Кыргызский", key: "kyrgyz" },
  { name: "Физика", subject: "Физика", key: "physics" },
  { name: "Химия", subject: "Химия", key: "chemistry" },
  { name: "Биология", subject: "Биология", key: "biology" },
  { name: "Информатика", subject: "Информатика", key: "informatics" },
  { name: "Python", subject: "Python", key: "python" },
  { name: "ОРТ", subject: "ОРТ", key: "ort" },
];

const SUBJECT_OPTIONS = [
  { value: "", label: "Все предметы" },
  { value: "Математика", label: "Математика" },
  { value: "Английский", label: "Английский" },
  { value: "Русский", label: "Русский" },
  { value: "Кыргызский", label: "Кыргызский" },
  { value: "Физика", label: "Физика" },
  { value: "Химия", label: "Химия" },
  { value: "Биология", label: "Биология" },
  { value: "Информатика", label: "Информатика" },
  { value: "Python", label: "Python" },
  { value: "ОРТ", label: "ОРТ" },
];

const CITY_OPTIONS = [
  { value: "", label: "Все города" },
  { value: "Бишкек", label: "Бишкек" },
  { value: "Ош", label: "Ош" },
  { value: "Онлайн", label: "Онлайн" },
];

export default function PgMain(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedSubject) params.set("subject", selectedSubject);
    if (selectedCity) params.set("city", selectedCity);
    const qs = params.toString();
    navigate(qs ? `/tutors?${qs}` : "/tutors");
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="kicker">Кыргызстан · репетиторы</div>
        <h1>{t("marketplace.hero_title", "Найдите репетитора в Кыргызстане")}</h1>
        <p className="lead">
          {t("marketplace.hero_subtitle", "Математика, английский, ОРТ, Python. Выберите предмет и город и начните уже сегодня.")}
        </p>

        {/* Search Bar */}
        <form className="search" onSubmit={handleSearch}>
          <CustomSelectField
            label="Предмет"
            labelId="subjLabel"
            value={selectedSubject}
            options={SUBJECT_OPTIONS}
            onChange={setSelectedSubject}
          />
          <CustomSelectField
            label="Город"
            labelId="locLabel"
            value={selectedCity}
            options={CITY_OPTIONS}
            onChange={setSelectedCity}
          />
          <div className="go-wrap">
            <button type="submit" className="go" aria-label="Найти репетитора">
              <span>{t("common.find", "Найти")}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </form>

        <p className="hint">
          {t("marketplace.become_hint", "Ты студент и хорошо знаешь предмет?")}{" "}
          <Link to="/become-tutor">{t("marketplace.become_tutor_cta", "Разместить резюме")}</Link>
        </p>
      </section>

      {/* Categories Section */}
      <section>
        <div className="cats-head">
          <h2>{t("categories.title", "Категории")}</h2>
          <span className="meta">{t("marketplace.subjects_hint", "Данные загружаются из каталога")}</span>
        </div>
        <ul className="cats">
          {CATEGORIES.map((cat) => (
            <li key={cat.key} className="cat">
              <Link to={`/tutors?subject=${encodeURIComponent(cat.subject)}`} aria-label={cat.name}>
                <span className="ico" aria-hidden="true">
                  <SubjectIcon name={cat.key} size={24} />
                </span>
                <span className="name">{cat.name}</span>
                <span className="arrow" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
