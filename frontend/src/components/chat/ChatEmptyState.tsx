import { useTranslation } from "react-i18next";

type Props = {
  variant?: "requests" | "chat";
};

export default function ChatEmptyState({ variant = "requests" }: Props): JSX.Element {
  const { t } = useTranslation();
  if (variant === "chat") {
    return (
      <div className="chat-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center", color: "var(--color-text-muted, #6B7280)", gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, background: "var(--color-primary-light, #EFF6FF)", color: "var(--color-primary, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>💬</div>
        <div style={{ fontWeight: 700, color: "var(--color-text, #111827)", fontSize: "1.1rem" }}>{t("chat.empty_chat_title", "Начните общение")}</div>
        <div style={{ fontSize: "0.875rem", maxWidth: 320, lineHeight: 1.5 }}>{t("chat.empty_chat_hint", "Отправьте первое сообщение — собеседник получит уведомление.")}</div>
      </div>
    );
  }
  return (
    <div className="chat-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center", color: "var(--color-text-muted)", gap: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, background: "var(--color-bg-secondary, #F3F4F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>📝</div>
      <div style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "1.1rem" }}>{t("chat.empty_requests_title", "У вас пока нет обращений")}</div>
      <div style={{ fontSize: "0.875rem", maxWidth: 320, lineHeight: 1.5 }}>{t("chat.empty_requests_hint", "Когда кто-то напишет вам или вы свяжетесь с репетитором, диалог появится здесь.")}</div>
      <a href="/tutors" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9999, background: "var(--color-primary, #2563EB)", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Найти репетитора →</a>
    </div>
  );
}
