import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../styles/HomeSectionCSS/Category.css";

/* Inline SVG icons — gradient blue #0a7cff → purple #7c3aed, matches Figma reference */
const gradId = (i: string) => `cat-grad-${i}`;

const IconMath = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("math")} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id={gradId("math2")} x1="16" y1="12" x2="48" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" /><stop offset="1" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
    <rect x="10" y="6" width="44" height="52" rx="8" fill="url(#cat-grad-math)" opacity="0.12" />
    <rect x="10" y="6" width="44" height="52" rx="8" stroke="url(#cat-grad-math)" strokeWidth="1.6" />
    <rect x="16" y="12" width="32" height="14" rx="4" fill="url(#cat-grad-math2)" />
    <text x="32" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" style={{ fontFamily: "Inter, sans-serif" }}>√x</text>
    <g fill="url(#cat-grad-math)">
      <rect x="16" y="30" width="8" height="7" rx="1.5" />
      <rect x="26" y="30" width="8" height="7" rx="1.5" />
      <rect x="36" y="30" width="4" height="7" rx="1.2" />
      <rect x="42" y="30" width="6" height="7" rx="1.2" />
      <rect x="16" y="39" width="8" height="7" rx="1.5" />
      <rect x="26" y="39" width="8" height="7" rx="1.5" />
      <rect x="36" y="39" width="8" height="7" rx="1.5" />
      <rect x="16" y="48" width="8" height="7" rx="1.5" />
      <rect x="26" y="48" width="8" height="7" rx="1.5" />
      <rect x="36" y="48" width="12" height="7" rx="1.5" />
    </g>
  </svg>
);

const IconAa = ({ label }: { label?: string }) => (
  <svg width="56" height="56" viewBox="0 0 64 40" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId(label || "aa")} x1="0" y1="0" x2="64" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <text x="32" y="32" textAnchor="middle" fontSize="38" fontWeight="800" fill="url(#cat-grad-aa)" style={{ fontFamily: "Georgia, serif", letterSpacing: "-1px" }}>Aa</text>
  </svg>
);

const IconKk = ({ dark }: { dark?: boolean }) => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("kk")} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    {/* Kyrgyz ornament corners — light version has 4 corners, dark version has vertical */}
    <g stroke="url(#cat-grad-kk)" strokeWidth="1.3" fill="none" opacity="0.9">
      {!dark ? (
        <>
          <path d="M10 14 L14 10 L18 14 L14 18 Z M10 50 L14 46 L18 50 L14 54 Z M46 14 L50 10 L54 14 L50 18 Z M46 50 L50 46 L54 50 L50 54 Z" />
          <path d="M12 10 L14 6 L16 10 M10 12 L6 14 L10 16 M54 12 L58 14 L54 16 M48 10 L50 6 L52 10 M12 50 L14 46 L16 50 M10 48 L6 50 L10 54 M52 50 L50 46 L48 50 M54 48 L58 50 L54 54" />
        </>
      ) : (
        <path d="M10 8 L14 12 L18 8 L14 4 Z M10 16 L14 20 L18 16 L14 12 Z M10 24 L14 28 L18 24 L14 20 Z M10 32 L14 36 L18 32 L14 28 Z M10 40 L14 44 L18 40 L14 36 Z M10 48 L14 52 L18 48 L14 44 Z" />
      )}
    </g>
    <text x="36" y="42" textAnchor="middle" fontSize="32" fontWeight="800" fill="url(#cat-grad-kk)" style={{ fontFamily: "Georgia, serif" }}>Кк</text>
  </svg>
);

const IconAtom = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("atom")} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="6" fill="url(#cat-grad-atom)" />
    <ellipse cx="32" cy="32" rx="22" ry="12" stroke="url(#cat-grad-atom)" strokeWidth="1.6" fill="none" />
    <ellipse cx="32" cy="32" rx="12" ry="22" stroke="url(#cat-grad-atom)" strokeWidth="1.6" fill="none" />
    <ellipse cx="32" cy="32" rx="22" ry="12" stroke="url(#cat-grad-atom)" strokeWidth="1.2" fill="none" transform="rotate(60 32 32)" opacity="0.7" />
    <circle cx="32" cy="10" r="2.2" fill="url(#cat-grad-atom)" />
    <circle cx="32" cy="54" r="2.2" fill="url(#cat-grad-atom)" />
    <circle cx="12" cy="22" r="2.2" fill="url(#cat-grad-atom)" />
    <circle cx="52" cy="42" r="2.2" fill="url(#cat-grad-atom)" />
  </svg>
);

const IconChem = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("chem")} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id={gradId("chem2")} x1="18" y1="28" x2="38" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" stopOpacity="0.45" /><stop offset="1" stopColor="#a78bfa" stopOpacity="0.45" />
      </linearGradient>
    </defs>
    <path d="M22 12 L22 26 L14 42 Q14 54 26 54 L30 54 Q42 54 42 42 L34 26 L34 12 Z" stroke="url(#cat-grad-chem)" strokeWidth="1.8" fill="none" />
    <path d="M18 42 Q18 52 26 52 L30 52 Q38 52 38 42 L34 32 Z" fill="url(#cat-grad-chem2)" />
    <circle cx="46" cy="22" r="4" stroke="url(#cat-grad-chem)" strokeWidth="1.5" fill="none" />
    <circle cx="54" cy="18" r="3" stroke="url(#cat-grad-chem)" strokeWidth="1.3" fill="none" />
    <circle cx="54" cy="34" r="3.5" stroke="url(#cat-grad-chem)" strokeWidth="1.3" fill="none" />
    <circle cx="46" cy="38" r="2.5" stroke="url(#cat-grad-chem)" strokeWidth="1.3" fill="none" />
    <path d="M48 24 L52 20 M48 36 L52 32 M46 25 L48 24 M52 34 L50 36" stroke="url(#cat-grad-chem)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconDNA = () => (
  <svg width="40" height="56" viewBox="0 0 40 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("dna")} x1="0" y1="0" x2="40" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M10 8 C18 14, 22 20, 10 28 C22 36, 18 42, 10 48 C18 54, 22 60, 10 66" stroke="url(#cat-grad-dna)" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M30 8 C22 14, 18 20, 30 28 C18 36, 22 42, 30 48 C22 54, 18 60, 30 66" stroke="url(#cat-grad-dna)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.95" />
    <g stroke="url(#cat-grad-dna)" strokeWidth="1.4" opacity="0.9">
      <path d="M12 16 L28 20" /><path d="M12 24 L28 28" /><path d="M12 32 L28 36" /><path d="M12 40 L28 44" /><path d="M12 48 L28 52" /><path d="M12 56 L28 60" />
    </g>
  </svg>
);

const IconCode = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("code")} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M20 18 L10 32 L20 46" stroke="url(#cat-grad-code)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M44 18 L54 32 L44 46" stroke="url(#cat-grad-code)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M36 10 L28 54" stroke="url(#cat-grad-code)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const IconPython = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("py1")} x1="8" y1="8" x2="42" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#2b8af6" />
      </linearGradient>
      <linearGradient id={gradId("py2")} x1="22" y1="28" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7c3aed" /><stop offset="1" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
    <path d="M18 12 Q18 8 26 8 L38 8 Q44 8 44 14 L44 28 L30 28 Q18 28 18 20 Z" fill="url(#cat-grad-py1)" />
    <path d="M46 52 Q46 56 38 56 L26 56 Q20 56 20 50 L20 36 L34 36 Q46 36 46 44 Z" fill="url(#cat-grad-py2)" />
    <circle cx="28" cy="16" r="2.2" fill="white" />
    <circle cx="36" cy="48" r="2.2" fill="white" />
  </svg>
);

const IconORT = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradId("ort")} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0a7cff" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M16 8 L44 8 L52 16 L52 54 L16 54 Z" stroke="url(#cat-grad-ort)" strokeWidth="1.6" fill="white" />
    <path d="M44 8 L44 16 L52 16" stroke="url(#cat-grad-ort)" strokeWidth="1.6" fill="none" />
    <g stroke="url(#cat-grad-ort)" strokeWidth="1.6" strokeLinecap="round">
      <path d="M22 24 L38 24" /><path d="M22 32 L42 32" /><path d="M22 40 L30 40" />
      <path d="M20 22 L24 26" strokeWidth="2" /><path d="M20 30 L24 34" strokeWidth="2" /><path d="M20 38 L24 42" strokeWidth="2" /><path d="M22 48 L26 52" strokeWidth="2" />
    </g>
    <circle cx="46" cy="48" r="12" fill="url(#cat-grad-ort)" />
    <path d="M38 48 L44 54 L54 42" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const Category = () => {
  const { t } = useTranslation();

  // порядок как в референсе: 5 сверху + 5 снизу
  const categories = [
    { key: "math", title: "Математика", slug: "matematika", icon: <IconMath /> },
    { key: "english", title: "Английский", slug: "angliyskiy", icon: <IconAa label="en" /> },
    { key: "russian", title: "Русский", slug: "russkiy", icon: <IconAa label="ru" /> },
    { key: "kyrgyz", title: "Кыргызский", slug: "kyrgyzskiy", icon: <IconKk /> },
    { key: "physics", title: "Физика", slug: "fizika", icon: <IconAtom /> },
    { key: "chemistry", title: "Химия", slug: "himiya", icon: <IconChem /> },
    { key: "biology", title: "Биология", slug: "biologiya", icon: <IconDNA /> },
    { key: "informatics", title: "Информатика", slug: "informatika", icon: <IconCode /> },
    { key: "python", title: "Python", slug: "python", icon: <IconPython /> },
    { key: "ort", title: "ОРТ", slug: "ort", icon: <IconORT /> },
  ];

  return (
    <section className="category-section inter" id="category">
      <div className="category-header">
        <span className="category-subtitle">{t("categories.subtitle", "Популярные направления")}</span>
        <h2 className="category-title">{t("categories.title", "Выберите категорию")}</h2>
      </div>
      <div className="category-grid category-grid--10">
        {categories.map((cat) => (
          <Link
            to={`/tutors?subject=${encodeURIComponent(cat.slug)}`}
            key={cat.key}
            className="category-card category-card--new"
          >
            <div className="category-icon category-icon--new">
              {cat.icon}
            </div>
            <h3 className="category-card-title">{cat.title}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Category;
