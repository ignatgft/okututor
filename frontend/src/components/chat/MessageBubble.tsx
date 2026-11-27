import type { ChatMessage } from "../../api/chat.api";
import { useTranslation } from "react-i18next";

type Props = {
  message: ChatMessage;
  isOwn: boolean;
};

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageBubble({ message, isOwn }: Props): JSX.Element {
  const { t } = useTranslation();
  const body = (message.body || (message.text as string) || "").trim();
  const time = formatTime((message.created_at as string) || (message.createdAt as string));
  const failed = (message as unknown as Record<string, unknown>)["failed"] as boolean | undefined;
  const sending = (message as unknown as Record<string, unknown>)["sending"] as boolean | undefined;
  const readAt = (message.read_at as string | undefined) || (message.readAt as string | undefined);
  const stateLabel = readAt
    ? (t("messages.read", "Прочитано") as string)
    : sending
      ? (t("messages.sending", "Отправка…") as string)
      : failed
        ? (t("messages.failed", "Не доставлено") as string)
        : (t("messages.sent", "Отправлено") as string);

  return (
    <div
      className={`chat-bubble-row ${isOwn ? "chat-bubble-row--own" : "chat-bubble-row--other"} ${failed ? "chat-bubble-row--failed" : ""}`}
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        padding: "4px var(--space-4, 16px)",
      }}
    >
      <div
        className="chat-bubble"
        style={{
          maxWidth: "min(78%, 480px)",
          padding: "10px 14px",
          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isOwn ? "var(--color-primary, #3563E9)" : "var(--color-surface, #fff)",
          color: isOwn ? "#fff" : "var(--color-text, #111827)",
          border: isOwn ? "none" : "1px solid var(--color-border, #E5E7EB)",
          boxShadow: "var(--shadow-sm)",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: "var(--font-size-base, 0.875rem)" }}>{body || "—"}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", marginTop: 4, opacity: 0.85, fontSize: "var(--font-size-xs, 0.75rem)", color: isOwn ? "rgba(255,255,255,0.85)" : "var(--color-text-muted)" }}>
          <span>{time}</span>
          {isOwn && (
            <span aria-label={stateLabel} title={stateLabel}>
              {failed ? "⚠" : sending ? "◷" : readAt ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
