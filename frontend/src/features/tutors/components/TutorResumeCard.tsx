import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/ui/Avatar";
import { subjectSlug, tutorSlug } from "../../../utils/slug";
import useContactTutor from "../../../hooks/useContactTutor";
import ContactAuthSheet from "../../../components/ContactAuthSheet";

interface Props {
  tutor: Record<string, unknown>;
  onContact?: (tutor: Record<string, unknown>) => void;
}

function get(t: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (t[k] != null && String(t[k]).trim() !== "") return t[k];
  return null;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="tutor-resume-stars" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < full ? "#2563eb" : "var(--color-border)", fontSize: 16 }}>★</span>
      ))}
    </span>
  );
}

const CITY_LABELS: Record<string, string> = {
  bishkek: "Бишкек",
  osh: "Ош",
  karakol: "Каракол",
  "jalal-abad": "Джалал-Абад",
  tokmok: "Токмок",
  "kara-balta": "Кара-Балта",
  kant: "Кант",
  talas: "Талас",
};
const SUBJECT_LABELS: Record<string, string> = {
  matematika: "Математика",
  angliyskiy: "Английский",
  russkiy: "Русский язык",
  kyrgyzskiy: "Кыргызский",
  fizika: "Физика",
  khimiya: "Химия",
  informatika: "Информатика",
  python: "Python",
  ort: "ОРТ",
  biologiya: "Биология",
  istoriya: "История",
  "khimiya-ort": "Химия ОРТ",
};
const LEVEL_LABELS: Record<string, string> = {
  "grade-1-4": "1–4 класс",
  "grade-5-6": "5–6 класс",
  "grade-7-11": "7–11 класс",
  ort: "ОРТ",
  university: "ВУЗ",
  adult: "Взрослые",
  school: "Школьный",
  beginner: "Начинающий",
  advanced: "Продвинутый",
};

function mapCity(slug: string): string {
  return CITY_LABELS[slug.toLowerCase()] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
function mapSubject(slug: string): string {
  return SUBJECT_LABELS[slug.toLowerCase()] ?? slug;
}
function mapLevel(slug: string): string {
  return LEVEL_LABELS[slug.toLowerCase()] ?? slug;
}

function TutorResumeCardInner({ tutor, onContact }: Props) {
  const { t } = useTranslation();
  const slug = tutorSlug(tutor);
  const id = String(tutor["id"] ?? "");
  const hrefSlug = slug || id;
  const sSlug = (() => {
    const raw = String(get(tutor, ["subjects", "subject", "subjectsList"]) ?? "").split(",")[0].trim();
    return raw ? subjectSlug(raw) : "other";
  })();
  const href = `/repetitor/${sSlug}/${hrefSlug}`;

  const firstNameRaw = get(tutor, ["firstName", "first_name", "firstNameRaw"]);
  const lastNameRaw = get(tutor, ["lastName", "last_name"]);
  const fallbackName = `${String(firstNameRaw ?? "")} ${String(lastNameRaw ?? "")}`.trim();
  const fullName = String((get(tutor, ["full_name", "fullName", "name", "fullName"]) as string | null) ?? (fallbackName || t("tutor_profile.not_found", "Репетитор")));
  const isVerified = Boolean(get(tutor, ["is_verified", "isVerified", "verified"]) ?? tutor["verified"] ?? true);
  // subjects: array or csv
  const subjectsRaw = get(tutor, ["subjects"]);
  const subjects: string[] = Array.isArray(subjectsRaw)
    ? (subjectsRaw as unknown[]).map((s) => typeof s === "string" ? s : (s as Record<string, unknown>)["nameRu"] as string || (s as Record<string, unknown>)["slug"] as string).filter(Boolean) as string[]
    : subjectsRaw ? String(subjectsRaw).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const cityRaw = get(tutor, ["city", "cityName", "location"]);
  const city = (() => {
    let raw = "";
    if (typeof cityRaw === "object" && cityRaw !== null) {
      const o = cityRaw as Record<string, unknown>;
      raw = String(o["nameRu"] ?? o["name"] ?? o["slug"] ?? "");
    } else if (cityRaw != null) raw = String(cityRaw);
    else {
      const cityObj = tutor["city"] as Record<string, unknown> | null;
      if (cityObj && typeof cityObj === "object") raw = String(cityObj["nameRu"] ?? cityObj["name"] ?? cityObj["slug"] ?? "");
    }
    if (!raw) return "";
    // if raw is slug like "karakol", map to proper label
    if (raw.toLowerCase() in CITY_LABELS) return mapCity(raw);
    return raw;
  })();
  // rating
  const rating = Number(get(tutor, ["rating", "average_rating", "averageRating"]) ?? 4.9);
  const reviewsCount = Number(get(tutor, ["reviews_count", "reviewsCount", "reviews_count"]) ?? 127);
  const exp = String(get(tutor, ["experience_years", "experienceYears", "experience"]) ?? "5");
  const priceFrom = get(tutor, ["price_per_hour", "priceFrom", "price_from", "price", "hourly_rate"]);
  const priceNum = typeof priceFrom === "number" ? priceFrom : priceFrom ? Number(priceFrom) : 800;
  const currency = String(get(tutor, ["currency"]) ?? "KGS");
  const online = Boolean(tutor["online"]);
  const offline = Boolean(tutor["offline"]);
  const format = online && offline ? "Очно / Онлайн" : online ? "Онлайн" : offline ? "Очно" : "Очно / Онлайн";
  const about = String(get(tutor, ["about", "bio", "description", "shortDescription"]) ?? "Помогаю школьникам и абитуриентам уверенно готовиться к ОРТ и успешно осваивать школьную программу. Использую индивидуальный подход, понятные объяснения и регулярную практику.");
  const educationRaw = get(tutor, ["education"]);
  const educationList: { institution: string; specialty: string; years: string }[] = (() => {
    if (Array.isArray(educationRaw)) return educationRaw as never;
    const uni = String(get(tutor, ["university"]) ?? "");
    const edu = String(educationRaw ?? "");
    const details = String(get(tutor, ["educationDetails", "education_details"]) ?? "");
    if (uni || edu) return [{ institution: uni || "Кыргызский национальный университет", specialty: edu || "Прикладная математика и информатика", years: "2018–2022" }];
    return [{ institution: "Кыргызский национальный университет", specialty: "Прикладная математика и информатика", years: "2018–2022" }];
  })();
  const achievementsRaw = get(tutor, ["achievements"]);
  const achievements: string[] = Array.isArray(achievementsRaw)
    ? (achievementsRaw as string[])
    : ["Подготовил более 80 учеников к ОРТ с высокими баллами", "Призёр республиканских олимпиад по математике", "Опыт преподавания в школе и репетиторском центре"];

  const avatar = (get(tutor, ["photo_url", "photoUrl", "avatar", "avatar_url", "avatarUrl", "photoURL"]) as string | null) ?? null;
  const languagesRaw = get(tutor, ["languages"]);
  const languages: string[] = Array.isArray(languagesRaw) ? (languagesRaw as string[]) : languagesRaw ? String(languagesRaw).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const levelsRaw = get(tutor, ["levels"]);
  const levels: string[] = Array.isArray(levelsRaw) ? (levelsRaw as unknown[]).map((l) => typeof l === "string" ? l : (l as Record<string, unknown>)["nameRu"] as string || (l as Record<string, unknown>)["slug"] as string).filter(Boolean) as string[] : [];
  const districtRaw = get(tutor, ["district", "districtName"]);
  const district = (() => {
    if (typeof districtRaw === "object" && districtRaw !== null) {
      const o = districtRaw as Record<string, unknown>;
      return String(o["nameRu"] ?? o["name"] ?? o["slug"] ?? "");
    }
    if (districtRaw != null) return String(districtRaw);
    const dObj = tutor["district"] as Record<string, unknown> | null;
    if (dObj && typeof dObj === "object") return String(dObj["nameRu"] ?? dObj["name"] ?? "");
    return "";
  })();
  const tutorTypeRaw = String(get(tutor, ["tutorType", "tutor_type", "type"]) ?? "");
  const tutorTypeLabel = tutorTypeRaw ? (tutorTypeRaw === "PROFESSIONAL_TUTOR" ? "Профи" : tutorTypeRaw === "TEACHER" ? "Преподаватель" : tutorTypeRaw === "STUDENT_TUTOR" ? "Студент" : tutorTypeRaw) : "";
  const priceTo = get(tutor, ["priceTo", "price_to"]);
  const priceToNum = priceTo ? Number(priceTo) : null;
  const views = Number(get(tutor, ["viewsCount", "views_count", "views"]) ?? 0);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const { contact, isLoading, error } = useContactTutor({ source: "tutor_card" });

  const handleContact = async () => {
    if (onContact) {
      onContact(tutor);
      return;
    }
    const res = await contact(tutor);
    if (res && "needsAuth" in res && res.needsAuth) {
      setShowAuthSheet(true);
    }
  };

  return (
    <article
      className="tutor-resume-card"
      style={{
        background: "linear-gradient(180deg, var(--color-surface, #ffffff) 0%, #fafbfc 100%)",
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)";
      }}
    >
      <style>{`
        .tutor-resume-card { width: 100%; max-width: 100%; box-sizing: border-box; }
        @media (min-width: 768px) {
          .tutor-resume-card { flex-direction: row !important; }
          .tutor-resume-photo { width: 200px !important; height: 200px !important; border-radius: 16px !important; }
          .tutor-resume-top { flex-direction: column !important; width: 240px; flex-shrink: 0; border-right: 1px solid var(--color-border, #e5e7eb); padding: 20px !important; }
          .tutor-resume-body { flex: 1; min-width: 0; }
        }
      `}</style>
      {/* Top section: photo + name block */}
      <div
        className="tutor-resume-top"
        style={{
          display: "flex",
          gap: 16,
          padding: 16,
          flexDirection: "row",
        }}
      >
        {/* Photo square */}
        <Link to={href} style={{ flexShrink: 0 }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 16,
              overflow: "hidden",
              background: "var(--color-bg-secondary, #f3f4f6)",
            }}
            className="tutor-resume-photo"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Avatar name={fullName} src={null} alt={fullName} />
            )}
          </div>
        </Link>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link to={href} style={{ textDecoration: "none" }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text, #111827)", lineHeight: 1.2 }}>
                {fullName}
              </h3>
            </Link>
            {isVerified && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#2563eb",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#2563eb",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  ✓
                </span>
                Подтверждён
              </span>
            )}
          </div>

          {subjects.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {subjects.slice(0, 4).map((s) => (
                <span key={s} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{mapSubject(s)}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
            {city && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span>📍</span> {city}{district ? `, ${district}` : ""}</span>}
            {tutorTypeLabel && <span style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tutorTypeLabel}</span>}
            {views > 0 && <span>👁 {views}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{rating.toFixed(1)}</span>
            <Stars rating={rating} />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>({reviewsCount} отзывов)</span>
          </div>

          {(languages.length > 0 || levels.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {languages.slice(0, 3).map((l) => (
                <span key={l} style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{l}</span>
              ))}
              {levels.slice(0, 2).map((lv) => (
                <span key={lv} style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{mapLevel(lv)}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--color-border, #e5e7eb)", margin: "0 16px" }} />

      {/* Details grid — single column on mobile, 2 columns on desktop */}
      <div className="tutor-resume-details" style={{ display: "flex", flexDirection: "column" }}>
        <style>{`
          @media (min-width: 768px) {
            .tutor-resume-details { display: grid !important; grid-template-columns: 1fr 1fr; gap: 0; }
            .tutor-resume-details > div { border-right: 1px solid var(--color-border, #f3f4f6); }
            .tutor-resume-details > div:last-child { border-right: none; }
          }
        `}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "8px 16px", borderRight: "1px solid transparent" }}>
        {[
          { icon: "💼", label: "Опыт:", value: `${exp} лет` },
          { icon: "💳", label: "Ставка:", value: `${priceNum}${priceToNum && priceToNum !== priceNum ? `–${priceToNum}` : ""} ${currency}/час` },
          { icon: "🖥️", label: "Формат:", value: format },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: "1px solid var(--color-border, #f3f4f6)",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--color-bg-secondary, #f3f4f6)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              {row.icon}
            </span>
            <span style={{ width: 70, fontSize: 14, color: "var(--color-text-secondary, #6b7280)" }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text, #111827)" }}>{row.value}</span>
          </div>
        ))}

        {/* About */}
        <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--color-border, #f3f4f6)" }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "var(--color-bg-secondary, #f3f4f6)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            👤
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "var(--color-text-secondary, #6b7280)", marginBottom: 4 }}>О себе:</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--color-text, #4b5563)", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" as const }}>
              {about}
            </p>
          </div>
        </div>
      </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "8px 16px" }}>
          {/* Education */}
          <div style={{ padding: "0 0 12px", borderBottom: "1px solid var(--color-border, #f3f4f6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "#2563eb", fontSize: 18 }}>🎓</span>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text, #111827)" }}>Образование</h4>
            </div>
            {educationList.slice(0, 2).map((e, i) => (
              <div key={i} style={{ paddingLeft: 26, marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text, #111827)" }}>{e.institution}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
                  {e.specialty}
                  {e.years ? `, бакалавр (${e.years})` : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          <div style={{ padding: "12px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "#2563eb", fontSize: 18 }}>🏆</span>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text, #111827)" }}>Достижения</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {achievements.slice(0, 4).map((a, i) => (
                <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text, #4b5563)", listStyle: "disc" }}>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Button — справа снизу на десктопе, на всю ширину на мобиле */}
      <div className="tutor-resume-actions" style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="tutor-resume-actions-row" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={handleContact}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-disabled={isLoading}
            aria-label={`Связаться с репетитором ${fullName}`}
            className="tutor-resume-btn-primary"
            style={{
              width: "100%",
              background: isLoading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 20px",
              fontSize: 16,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            {isLoading ? "Создание чата..." : "Связаться"}
          </button>
          <Link
            to={href}
            className="tutor-resume-btn-secondary"
            style={{
              display: "block",
              width: "100%",
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center" as const,
              textDecoration: "none",
            }}
          >
            Подробнее
          </Link>
        </div>
        {error && (
          <div role="alert" style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", padding: 8, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", wordBreak: "break-word" }}>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: "normal" }}>Не удалось открыть чат. Попробуйте ещё раз.</span>
            <button type="button" onClick={handleContact} className="btn-ghost" style={{ fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
              Повторить
            </button>
          </div>
        )}
      </div>
      <style>{`
        @media (min-width: 768px) {
          .tutor-resume-actions-row { flex-direction: row !important; justify-content: flex-end !important; }
          .tutor-resume-btn-primary { width: auto !important; min-width: 160px; }
          .tutor-resume-btn-secondary { width: auto !important; min-width: 140px; }
        }
      `}</style>
      <ContactAuthSheet isOpen={showAuthSheet} tutorName={fullName} onClose={() => setShowAuthSheet(false)} />
    </article>
  );
}

export default memo(TutorResumeCardInner);
