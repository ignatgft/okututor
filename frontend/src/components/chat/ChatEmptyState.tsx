import { useTranslation } from "react-i18next";

type Props = {
  variant?: "requests" | "chat";
};

export default function ChatEmptyState({ variant = "requests" }: Props): JSX.Element {
  const { t } = useTranslation();
  if (variant === "chat") {
    return (
      <div className="chat-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-12, 32px) var(--space-6, 24px)", textAlign: "center", color: "var(--color-text-muted, #6B7280)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>💬</div>
        <div style={{ fontWeight: 600, color: "var(--color-text, #111827)" }}>{t("chat.empty_chat_title", "Начните общение")}</div>
        <div style={{ marginTop: 6, fontSize: "var(--font-size-sm, 0.875rem)", maxWidth: 320 }}>{t("chat.empty_chat_hint", "Отправьте первое сообщение — собеседник получит уведомление.")}</div>
      </div>
    );
  }
  return (
    <div className="chat-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-12, 32px) var(--space-6)", textAlign: "center", color: "var(--color-text-muted)" }}>
      <div style={{ fontSize: "2rem", marginBottom: 12 }}>📭</div>
      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{t("chat.empty_requests_title", "У вас пока нет обращений")}</div>
      <div style={{ marginTop: 6, fontSize: "var(--font-size-sm)", maxWidth: 320 }}>{t("chat.empty_requests_hint", "Когда кто-то напишет вам или вы свяжетесь с репетитором, диалог появится здесь.")}</div>
    </div>
  );
}
