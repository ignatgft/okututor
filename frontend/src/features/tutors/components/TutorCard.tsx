import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/ui/Avatar";
import { tutorTypeLabel, isStudentTutor } from "../../../constants/tutorTypes";
import { subjectSlug, tutorSlug } from "../../../utils/slug";

interface TutorCardProps {
  tutor: Record<string, unknown>;
}

function getField(tutor: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (tutor[k] != null && String(tutor[k]).trim() !== "") return tutor[k];
  return null;
}

function TutorCardInner({ tutor }: TutorCardProps) {
  const { t } = useTranslation();
  const id = String(tutor["id"] ?? "");
  const slug = tutorSlug(tutor);
  const name = String(getField(tutor, ["full_name", "fullName", "name"]) ?? t("tutor_profile.not_found", "Репетитор"));
  const subjectRaw = String(getField(tutor, ["subject", "subjects", "main_subject"]) ?? "");
  const subject = subjectRaw ? String(subjectRaw).split(",")[0].trim() : "";
  const city = String(getField(tutor, ["city", "location"]) ?? "");
  const formatRaw = String(getField(tutor, ["format", "location_type", "teaching_format"]) ?? "");
  const format = formatRaw ? t(`search.${formatRaw.toLowerCase()}`, formatRaw) : "";
  const price = getField(tutor, ["price", "price_per_hour", "hourly_rate"]);
  const priceNum = typeof price === "number" ? price : price ? Number(price) : null;
  const currency = String(getField(tutor, ["currency"]) ?? "KGS");
  const typeRaw = String(getField(tutor, ["tutor_type", "tutorType", "type", "role"]) ?? "");
  const typeLabel = typeRaw ? tutorTypeLabel(typeRaw, t as (k: string, fb: string) => string) : "";
  const isStudent = isStudentTutor(typeRaw);
  const bio = String(getField(tutor, ["bio", "about", "description"]) ?? "");
  const shortDesc = bio.length > 120 ? bio.slice(0, 120) + "…" : bio;
  const avatar = (getField(tutor, ["avatar", "avatar_url", "avatarUrl", "photoURL"]) as string | null) ?? null;
  const sSlug = subject ? subjectSlug(subject) : "other";

  // SEO URL: /repetitor/{subject}/{slug} canonical; also /tutor/{slug}
  const href = `/repetitor/${sSlug}/${slug || id}`;

  return (
    <article className="tutor-card" style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-5)",
      display: "flex",
      gap: "var(--space-4)",
      transition: "all var(--transition-base)",
      contentVisibility: "auto" as unknown as string,
      containIntrinsicSize: "300px" as unknown as string,
    }}>
      <Link to={href} aria-label={name} style={{ flexShrink: 0 }}>
        <Avatar name={name} src={avatar} alt={name} className="tutor-card-avatar" />
      </Link>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <Link to={href} style={{ textDecoration: "none" }}>
          <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", margin: 0, lineHeight: 1.3 }}>
            {name}
          </h3>
        </Link>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
          {subject && <span style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: 500 }}>{subject}</span>}
          {typeLabel && (
            <span
              style={{
                background: isStudent ? "rgba(245,158,11,0.12)" : "var(--color-bg-secondary)",
                color: isStudent ? "#b45309" : "var(--color-text-secondary)",
                border: isStudent ? "1px solid #f59e0b" : "1px solid var(--color-border)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
              }}
              title={isStudent ? "Студент-репетитор — доступная цена, свежие знания" : undefined}
            >
              {typeLabel}
            </span>
          )}
          {city && <span>• {city}</span>}
          {format && <span>• {format}</span>}
          {priceNum != null && !Number.isNaN(priceNum) && <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{priceNum} {currency}/час</span>}
        </div>

        {shortDesc && (
          <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {shortDesc}
          </p>
        )}

        <div style={{ marginTop: 8 }}>
          <Link
            to={href}
            className="btn-primary"
            style={{ display: "inline-flex", padding: "8px 16px", fontSize: "var(--font-size-sm)", borderRadius: "var(--radius-lg)", textDecoration: "none" }}
          >
            {t("common.view", "Подробнее")}
          </Link>
        </div>
      </div>
    </article>
  );
}
export default memo(TutorCardInner);
