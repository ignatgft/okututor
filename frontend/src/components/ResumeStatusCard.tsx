import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import ResumeExpiryTimer from "./ResumeExpiryTimer";

interface Props {
  status: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  expiringSoon?: boolean;
  onEdit?: () => void;
  onHide?: () => void;
  onRenew?: () => void;
  onRestore?: () => void;
}

export default function ResumeStatusCard({ status, publishedAt, expiresAt, expiringSoon, onEdit, onHide, onRenew, onRestore }: Props) {
  const { t } = useTranslation();
  const isActive = status === "PUBLISHED" && !expiringSoon;
  const isExpiring = expiringSoon || status === "EXPIRING";
  const isExpired = status === "EXPIRED" || (expiresAt && new Date(expiresAt) < new Date());
  const isHidden = status === "HIDDEN";
  const isDraft = status === "DRAFT";

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); } catch { return iso; }
  };

  if (isExpired) {
    return (
      <div style={{ background: "var(--color-danger-soft)", border: "1px solid var(--color-danger)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <div style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-danger)", marginBottom: "var(--space-1)", fontSize: "var(--font-size-base)" }}>{t("dashboard.resume_expired", "Резюме больше не отображается в поиске.")}</div>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", lineHeight: "var(--line-height-normal)" }}>{t("dashboard.resume_expired_hint", "Ваш профиль сохранён — вы можете снова опубликовать резюме в любой момент.")}</div>
        <button type="button" onClick={onRenew} className="btn btn-primary" style={{ minHeight: "var(--touch-target)" }}>{t("dashboard.renew_30", "Продлить на 30 дней")}</button>
        <div style={{ marginTop: "var(--space-2)" }}><Link to="/become-tutor" style={{ fontSize: "var(--font-size-sm)", color: "var(--color-danger)", fontWeight: "var(--font-weight-medium)" }}>{t("common.edit", "Редактировать")}</Link></div>
      </div>
    );
  }

  if (isExpiring) {
    return (
      <div style={{ background: "var(--color-warning-soft)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <div style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-warning)", marginBottom: "var(--space-1)", fontSize: "var(--font-size-base)" }}>{t("dashboard.resume_expiring", "Резюме скоро перестанет отображаться в поиске.")}</div>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <ResumeExpiryTimer expiresAt={expiresAt} publishedAt={publishedAt} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button type="button" onClick={onRenew} className="btn btn-primary" style={{ minHeight: "var(--touch-target)" }}>{t("dashboard.renew_30", "Продлить на 30 дней")}</button>
          {onEdit && <button type="button" onClick={onEdit} className="btn btn-secondary" style={{ minHeight: "var(--touch-target)" }}>{t("common.edit", "Редактировать")}</button>}
          {onHide && <button type="button" onClick={onHide} className="btn btn-ghost" style={{ minHeight: "var(--touch-target)" }}>{t("dashboard.hide", "Скрыть")}</button>}
        </div>
      </div>
    );
  }

  if (isHidden) {
    return (
      <div style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
        <div style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", fontSize: "var(--font-size-base)" }}>{t("dashboard.resume_hidden", "Резюме скрыто")}</div>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)", lineHeight: "var(--line-height-normal)" }}>{t("dashboard.resume_hidden_hint", "Резюме не отображается в поиске.")}</div>
        <button type="button" onClick={onRestore} className="btn btn-primary" style={{ minHeight: "var(--touch-target)" }}>{t("dashboard.restore", "Восстановить")}</button>
      </div>
    );
  }

  // ACTIVE or DRAFT default
  return (
    <div
      style={{
        background: isActive ? "color-mix(in srgb, var(--color-success) 8%, var(--color-surface))" : "var(--color-surface)",
        border: `1px solid ${isActive ? "color-mix(in srgb, var(--color-success) 22%, var(--color-border))" : "var(--color-border)"}`,
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-5)",
        boxShadow: isActive ? "var(--shadow-sm)" : "none",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", flex: "1 1 280px", minWidth: 0 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-full)",
              background: isActive ? "var(--color-success)" : "var(--color-bg-secondary)",
              color: isActive ? "#fff" : "var(--color-text-muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: isActive ? "0 2px 8px color-mix(in srgb, var(--color-success) 30%, transparent)" : "none",
            }}
          >
            <ShieldCheck size={22} strokeWidth={2.2} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: "var(--font-weight-bold)", color: isActive ? "var(--color-text-primary)" : "var(--color-text)", fontSize: "var(--font-size-base)", lineHeight: 1.2 }}>
              {isActive ? t("dashboard.resume_active", "Резюме активно") : isDraft ? t("dashboard.resume_draft", "Черновик") : `Статус: ${status}`}
            </div>
            {isActive && expiresAt ? (
              <div style={{ marginTop: "var(--space-2)" }}>
                <ResumeExpiryTimer expiresAt={expiresAt} publishedAt={publishedAt} />
              </div>
            ) : (
              !isActive && expiresAt && <div style={{ marginTop: "var(--space-1)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)" }}>{t("dashboard.active_until", "Активно до")} {formatDate(expiresAt)}</div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", flexShrink: 0, minWidth: 140 }}>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="btn btn-secondary"
              style={{
                minHeight: "var(--touch-target)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-primary)",
                color: "var(--color-primary)",
                fontWeight: "var(--font-weight-semibold)",
                borderRadius: "var(--radius-lg)",
                whiteSpace: "nowrap",
              }}
            >
              {t("common.edit", "Редактировать")}
            </button>
          )}
          {isActive && onHide && (
            <button
              type="button"
              onClick={onHide}
              className="btn btn-primary"
              style={{
                minHeight: "var(--touch-target)",
                background: "var(--color-success)",
                borderColor: "var(--color-success)",
                color: "#fff",
                fontWeight: "var(--font-weight-semibold)",
                borderRadius: "var(--radius-lg)",
                whiteSpace: "nowrap",
              }}
            >
              {t("dashboard.hide", "Скрыть")}
            </button>
          )}
        </div>
      </div>
      {isActive && <div style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-normal)" }}>{t("dashboard.renew_available_when_expired", "Продление станет доступно за 3 дня до окончания.")}</div>}
    </div>
  );
}
