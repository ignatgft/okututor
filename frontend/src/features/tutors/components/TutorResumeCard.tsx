import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, MapPin, Briefcase, CreditCard, Monitor, User, GraduationCap, Trophy, Heart, Share2 } from "lucide-react";
import { Avatar } from "../../../components/ui/Avatar";
import { subjectSlug, tutorSlug } from "../../../utils/slug";
import useContactTutor from "../../../hooks/useContactTutor";
import ContactAuthSheet from "../../../components/ContactAuthSheet";
import { useFavoriteIds, useToggleFavorite } from "../../../hooks/useFavorites";
import ResumeExpiryTimer from "../../../components/ResumeExpiryTimer";
import { normalizeMediaUrl } from "../../../utils/mediaUrl";
import useAuthStore from "../../../store/authStore";
import { useToast } from "../../../components/ui/Toast";

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
        <span key={i} style={{ color: i < full ? "var(--color-primary)" : "var(--color-border)", fontSize: "var(--font-size-base)" }}>★</span>
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
  const rating = Number(get(tutor, ["rating", "average_rating", "averageRating"]) ?? 0);
  const reviewsCount = Number(get(tutor, ["reviews_count", "reviewsCount", "reviews_count"]) ?? 0);
  const exp = String(get(tutor, ["experience_years", "experienceYears", "experience"]) ?? "5");
  const priceFrom = get(tutor, ["price_per_hour", "priceFrom", "price_from", "price", "hourly_rate"]);
  const priceNum = typeof priceFrom === "number" ? priceFrom : priceFrom ? Number(priceFrom) : 800;
  const currency = String(get(tutor, ["currency"]) ?? "KGS");
  const online = Boolean(tutor["online"]);
  const offline = Boolean(tutor["offline"]);
  const format = online && offline ? "Очно / Онлайн" : online ? "Онлайн" : offline ? "Очно" : "Очно / Онлайн";
  const aboutRaw = get(tutor, ["about", "bio", "description", "shortDescription"]);
  const about = aboutRaw ? String(aboutRaw) : "";
  const educationRaw = get(tutor, ["education"]);
  const educationList: { institution: string; specialty: string; years: string }[] = (() => {
    if (Array.isArray(educationRaw)) return educationRaw as never;
    const uni = String(get(tutor, ["university"]) ?? "").trim();
    const edu = String(educationRaw ?? "").trim();
    const details = String(get(tutor, ["educationDetails", "education_details"]) ?? "").trim();
    if (!uni && !edu) return [];
    return [{ institution: uni, specialty: edu, years: details }];
  })();
  const achievementsRaw = get(tutor, ["achievements"]);
  const achievements: string[] = Array.isArray(achievementsRaw)
    ? (achievementsRaw as string[])
    : [];

  const rawAvatar = (get(tutor, ["photo_url", "photoUrl", "avatar", "avatar_url", "avatarUrl", "photoURL"]) as string | null) ?? null;
  const avatar = normalizeMediaUrl(rawAvatar) ?? rawAvatar;
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
  const profileId = String(tutor["id"] ?? "");
  const { data: favIds } = useFavoriteIds(!!profileId);
  const isFavServer = favIds ? favIds.includes(profileId) : false;
  // Кеш ids обновляется оптимистично в useToggleFavorite (setQueryData), локальный стейт только для мгновенной анимации
  const [animKey, setAnimKey] = useState(0);
  const isFav = isFavServer;
  const toggleFav = useToggleFavorite();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const { contact, isLoading, error } = useContactTutor({ source: "tutor_card" });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const toast = useToast();
  const handleToggleFav = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profileId) return;
    if (!isAuthenticated) {
      setShowAuthSheet(true);
      return;
    }
    setAnimKey((k) => k + 1);
    toggleFav.mutate(
      { profileId, isFav: isFavServer },
      {
        onError: () => {
          // откат уже в useToggleFavorite.onError
        },
      }
    );
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: fullName, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t("share.copied", "Ссылка скопирована"));
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success(t("share.copied", "Ссылка скопирована"));
    } catch {
      toast.error(t("share.error", "Не удалось скопировать ссылку"));
    }
  };

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
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-2xl)",
        overflow: "hidden",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        flexDirection: "column",
        transition: "transform var(--transition-base), box-shadow var(--transition-base)",
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
        {/* Photo square with views & fav — heart вне Link чтобы не триггерить навигацию */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          <Link to={href} style={{ display: "block" }}>
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--color-bg-secondary, #f3f4f6)",
                position: "relative",
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
              {/* views badge */}
              <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}>
                <Eye size={12} /> {views}
              </span>
            </div>
          </Link>
          <style>{`
            @keyframes resume-heart-pop {
              0% { transform: scale(1); }
              40% { transform: scale(1.45); }
              65% { transform: scale(0.8); }
              100% { transform: scale(1); }
            }
            @keyframes resume-heart-burst {
              0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4), 0 2px 8px rgba(0,0,0,0.12); }
              100% { box-shadow: 0 0 0 14px rgba(220,38,38,0), 0 2px 8px rgba(0,0,0,0.12); }
            }
            @media (prefers-reduced-motion: reduce) {
              .resume-heart-icon { animation: none !important; }
            }
          `}</style>
          <button
            type="button"
            aria-label={isFav ? "Убрать из избранного" : "В избранное"}
            aria-pressed={isFav}
            onClick={handleToggleFav}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: isFav ? "1px solid #FECACA" : "1px solid var(--color-border)",
              background: isFav ? "#FEE2E2" : "rgba(255,255,255,0.95)",
              color: isFav ? "#DC2626" : "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: isFav ? "0 2px 10px rgba(220,38,38,0.28)" : "0 2px 8px rgba(0,0,0,0.12)",
              transition: "background-color 160ms var(--ease-out), border-color 160ms var(--ease-out), color 160ms var(--ease-out)",
              animation: isFav ? "resume-heart-burst 520ms var(--ease-out) both" : "none",
              fontSize: isFav ? 16 : 14,
              zIndex: 1,
            }}
          >
            <span
              key={`${isFav ? "fav" : "unfav"}-${animKey}`}
              className="resume-heart-icon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                animation: isFav ? "resume-heart-pop 420ms var(--ease-out) both" : "none",
              }}
            >
              <Heart size={16} fill={isFav ? "currentColor" : "none"} />
            </span>
          </button>
        </div>

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
                  gap: "var(--space-1)",
                  color: "var(--color-primary)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  ✓
                </span>
                Подтверждён
              </span>
            )}
          </div>

          {subjects.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
              {subjects.slice(0, 4).map((s) => (
                <span key={s} style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>{mapSubject(s)}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
            {city && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {city}{district ? `, ${district}` : ""}</span>}
            {tutorTypeLabel && <span style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tutorTypeLabel}</span>}
            {views > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={14} /> {views}</span>}
          </div>
          {(tutor["expiresAt"] || tutor["expires_at"]) && (
            <div style={{ marginTop: 4 }}>
              <ResumeExpiryTimer expiresAt={String(tutor["expiresAt"] ?? tutor["expires_at"])} publishedAt={String(tutor["publishedAt"] ?? tutor["published_at"] ?? "")} compact />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {reviewsCount > 0 ? (
              <>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{rating.toFixed(1)}</span>
                <Stars rating={rating} />
                <span style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>({reviewsCount} {reviewsCount === 1 ? "отзыв" : reviewsCount < 5 ? "отзыва" : "отзывов"})</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("tutor.no_reviews", "Нет отзывов")}</span>
            )}
          </div>

          {(languages.length > 0 || levels.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {languages.slice(0, 3).map((l) => (
                <span key={l} style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{l}</span>
              ))}
              {levels.slice(0, 2).map((lv) => (
                <span key={lv} style={{ background: "var(--color-success-soft)", color: "var(--color-success)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{mapLevel(lv)}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider - hide on desktop, card uses vertical divider */}
      <div className="tutor-resume-divider" style={{ height: 1, background: "var(--color-border, #e5e7eb)", margin: "0 16px" }} />
      <style>{`@media (min-width: 768px) { .tutor-resume-divider { display: none !important; } }`}</style>

      <div className="tutor-resume-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
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
          { Icon: Briefcase, label: "Опыт:", value: `${exp} лет` },
          { Icon: CreditCard, label: "Ставка:", value: `${priceNum}${priceToNum && priceToNum !== priceNum ? `–${priceToNum}` : ""} ${currency}/час` },
          { Icon: Monitor, label: "Формат:", value: format },
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
                color: "var(--color-text-secondary)",
              }}
            >
              <row.Icon size={18} />
            </span>
            <span style={{ width: 70, fontSize: 14, color: "var(--color-text-secondary, #6b7280)" }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text, #111827)" }}>{row.value}</span>
          </div>
        ))}

        {/* About - only if exists */}
        {about && (
          <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: educationList.length || achievements.length ? "1px solid var(--color-border, #f3f4f6)" : "none" }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--color-bg-secondary, #f3f4f6)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
                flexShrink: 0,
              }}
            >
              <User size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "var(--color-text-secondary, #6b7280)", marginBottom: 4 }}>О себе:</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--color-text, #4b5563)", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" as const }}>
                {about}
              </p>
            </div>
          </div>
        )}
      </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "8px 16px" }}>
          {/* Education - only if exists */}
          {educationList.length > 0 && (
            <div style={{ padding: "0 0 12px", borderBottom: achievements.length ? "1px solid var(--color-border, #f3f4f6)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--color-primary)", display: "inline-flex" }}><GraduationCap size={18} /></span>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text, #111827)" }}>Образование</h4>
              </div>
              {educationList.slice(0, 2).map((e, i) => (
                <div key={i} style={{ paddingLeft: 26, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text, #111827)" }}>{e.institution || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Не указано</span>}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
                    {e.specialty || "—"}
                    {e.years ? `, бакалавр (${e.years})` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Achievements - only if exists */}
          {achievements.length > 0 && (
            <div style={{ padding: educationList.length ? "12px 0 0" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--color-primary)", display: "inline-flex" }}><Trophy size={18} /></span>
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
          )}
          {educationList.length === 0 && achievements.length === 0 && !about && (
            <div style={{ padding: "12px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, fontStyle: "italic" }}>
              Информация пока не заполнена
            </div>
          )}
        </div>
      </div>

      {/* Button — справа снизу на десктопе, на всю ширину на мобиле */}
      <div className="tutor-resume-actions" style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <div className="tutor-resume-actions-row" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={handleContact}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-disabled={isLoading}
            aria-label={`Связаться с репетитором ${fullName}`}
            className="btn btn-primary tutor-resume-btn-primary"
            style={{
              width: "100%",
              minHeight: "var(--touch-target)",
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-bold)",
              boxShadow: "var(--shadow-sm)",
              opacity: isLoading ? 0.8 : 1,
            }}
          >
            {isLoading ? "Создание чата..." : "Связаться"}
          </button>
          <div className="tutor-resume-share-wrap" style={{ display: "flex", gap: 8, width: "100%" }}>
            <button
              type="button"
              onClick={handleShare}
              aria-label={t("share.title", "Поделиться")}
              className="tutor-resume-btn-share"
              style={{
                flex: "0 0 44px",
                width: 44,
                height: 44,
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--color-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title={t("share.title", "Поделиться")}
            >
              <Share2 size={18} />
            </button>
            <Link
              to={href}
              className="tutor-resume-btn-secondary"
              style={{
                display: "block",
                flex: 1,
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center" as const,
                textDecoration: "none",
                minHeight: 44,
                lineHeight: "22px",
              }}
            >
              Подробнее
            </Link>
          </div>
        </div>
        {error && (
          <div role="alert" style={{ fontSize: 13, color: "var(--color-danger)", background: "var(--color-danger-soft, #fef2f2)", border: "1px solid var(--color-danger)", padding: 8, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", wordBreak: "break-word" }}>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: "normal" }}>{error}</span>
            <button type="button" onClick={handleContact} className="btn-ghost" style={{ fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
              {t("common.retry", "Повторить")}
            </button>
          </div>
        )}
      </div>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .tutor-resume-actions-row { flex-direction: row !important; justify-content: flex-end !important; align-items: center !important; }
          .tutor-resume-btn-primary { width: auto !important; min-width: 160px; }
          .tutor-resume-btn-secondary { width: auto !important; min-width: 140px; }
          .tutor-resume-share-wrap { width: auto !important; }
          .tutor-resume-main { border-left: 1px solid var(--color-border, #e5e7eb); }
        }
        [data-theme="dark"] .tutor-resume-card { background: #111111 !important; border-color: #222 !important; }
        [data-theme="dark"] .tutor-resume-card .tutor-resume-top { border-color: #222 !important; }
        [data-theme="dark"] .tutor-resume-btn-secondary { background: #1a1a1a !important; border-color: #2a2a2a !important; color: #e5e5e5 !important; }
      `}</style>
      <ContactAuthSheet isOpen={showAuthSheet} tutorName={fullName} onClose={() => setShowAuthSheet(false)} />
    </article>
  );
}

export default memo(TutorResumeCardInner);
