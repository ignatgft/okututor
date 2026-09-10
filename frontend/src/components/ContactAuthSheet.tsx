import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  isOpen: boolean;
  tutorName?: string;
  onClose: () => void;
}

export default function ContactAuthSheet({ isOpen, tutorName, onClose }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    primaryRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="contact-auth-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("contact.auth_title", "Войдите чтобы связаться")}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface, #fff)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
          {t("contact.auth_title", "Чтобы связаться с репетитором, войдите или создайте аккаунт.")}
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          {t("contact.auth_desc", `После входа вы автоматически вернётесь к ${tutorName ? `репетитору ${tutorName}` : "репетитору"} и откроется чат.`)}
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-muted)" }}>
          {t("contact.auth_hint", "Не нужно снова искать — мы сохраним ваш выбор.")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            ref={primaryRef}
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            style={{ width: "100%", justifyContent: "center", minHeight: 44 }}
            aria-label={t("auth.login", "Войти")}
          >
            {t("auth.login", "Войти")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClose();
              navigate("/register");
            }}
            style={{ width: "100%", justifyContent: "center", minHeight: 44 }}
          >
            {t("auth.register", "Создать аккаунт")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ width: "100%", minHeight: 44 }}>
            {t("common.cancel", "Отмена")}
          </button>
        </div>
      </div>
    </div>
  );
}
