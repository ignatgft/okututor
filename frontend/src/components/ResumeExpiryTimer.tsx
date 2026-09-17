import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useCountdown } from "../hooks/schedule/useCountdown";

interface Props {
  expiresAt?: string | null;
  publishedAt?: string | null;
  compact?: boolean;
}

function ResumeExpiryTimerInner({ expiresAt, publishedAt, compact = false }: Props) {
  const { t } = useTranslation();
  const countdown = useCountdown(expiresAt ?? null);

  if (!expiresAt) {
    return <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{t("dashboard.no_expiry", "Без срока")}</span>;
  }

  if (countdown.isPast) {
    return (
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-danger)", fontWeight: "var(--font-weight-semibold)" }}>
        {t("dashboard.expired_ago", "Истекло")}
      </span>
    );
  }

  const days = countdown.days;
  const isExpiringSoon = days <= 7;
  const isCritical = days <= 1;

  const color = isCritical ? "var(--color-danger)" : isExpiringSoon ? "var(--color-warning)" : "var(--color-text-secondary)";

  // helper to get only unit word without duplicated count (t returns "{{count}} часа" when count passed)
  const unit = (key: string, fallback: string, count: number): string => {
    const v = t(key, fallback, { count }) as string;
    return v.replace(new RegExp(`^${count}\\s*`), "").trim() || fallback;
  };

  if (compact) {
    return (
      <span style={{ fontSize: "var(--font-size-sm)", color, fontWeight: isExpiringSoon ? "var(--font-weight-semibold)" : "var(--font-weight-regular)" }}>
        {days > 0 ? `${days} ${t("plural.day", "д")}` : `${countdown.hours} ${unit("plural.hour", "ч", countdown.hours)} ${countdown.minutes} ${unit("plural.minute", "мин", countdown.minutes)}`}
      </span>
    );
  }

  const totalDays = publishedAt ? Math.max(1, Math.round((new Date(expiresAt).getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24))) : 30;
  const progress = Math.max(0, Math.min(100, ((totalDays - days) / totalDays) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", lineHeight: 1.3 }}>
        <span style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-primary)", fontWeight: "var(--font-weight-regular)" }}>
          <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", fontSize: "var(--font-size-lg)" }}>{days}</span>{" "}
          <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>{t("plural.day", "д")}</span>{" "}
          <span style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-lg)" }}>{countdown.hours}</span>{" "}
          {unit("plural.hour", "ч", countdown.hours)}{" "}
          <span style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-lg)" }}>{countdown.minutes}</span>{" "}
          {unit("plural.minute", "мин", countdown.minutes)}
          <span style={{ color: "var(--color-text-secondary)", fontWeight: "var(--font-weight-regular)", fontSize: "var(--font-size-sm)" }}> {t("dashboard.until_expiry", "до окончания")}</span>
        </span>
        {isExpiringSoon && (
          <span style={{ fontSize: "var(--font-size-xs)", background: isCritical ? "var(--color-danger-soft)" : "var(--color-warning-soft)", color, padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: "var(--font-weight-semibold)" }}>
            {isCritical ? t("dashboard.expires_tomorrow", "Истекает завтра") : t("dashboard.expiring_soon", "Скоро истекает")}
          </span>
        )}
      </div>
      <div style={{ height: 8, background: "color-mix(in srgb, var(--color-success) 12%, var(--color-bg-secondary))", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${100 - progress}%`,
            background: isCritical
              ? "var(--color-danger)"
              : isExpiringSoon
                ? "var(--color-warning)"
                : "linear-gradient(90deg, var(--color-primary) 0%, #0EA5E9 55%, var(--color-success) 100%)",
            transition: "width var(--transition-slow) var(--ease-out)",
            borderRadius: "var(--radius-full)",
          }}
        />
      </div>
      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-normal)" }}>
        {t("dashboard.published_at", "Опубликовано")}: {publishedAt ? new Date(publishedAt).toLocaleDateString("ru-RU") : "—"} • {t("dashboard.expires_at", "Истекает")}: {new Date(expiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}

export default memo(ResumeExpiryTimerInner);
