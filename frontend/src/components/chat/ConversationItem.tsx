import type { ChatConversation } from "../../api/chat.api";
import UnreadBadge from "./UnreadBadge";

type Props = {
  conversation: ChatConversation;
  active?: boolean;
  onSelect: (c: ChatConversation) => void;
};

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso as string);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Вчера";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function ConversationItem({ conversation, active, onSelect }: Props): JSX.Element {
  const name = (conversation.counterpart_name as string | null) || "Собеседник";
  const last = (conversation.last_message as string | null) || "";
  const time = formatTime((conversation.last_message_at as string | null) || (conversation.updated_at as string | null) || (conversation.created_at as string | null));
  const unread = conversation.unread_count ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`chat-convo-item ${active ? "chat-convo-item--active" : ""}`}
      style={{
        display: "flex",
        gap: 12,
        width: "100%",
        padding: "12px 16px",
        textAlign: "left",
        background: active ? "var(--color-primary-light, #EDF2FF)" : "var(--color-surface, #fff)",
        border: "none",
        borderBottom: "1px solid var(--color-border-light, #F0F2F5)",
        cursor: "pointer",
        alignItems: "center",
        minHeight: 72,
      }}
      aria-current={active ? "true" : undefined}
    >
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-full, 999px)",
          background: "var(--color-bg-secondary, #E5E7EB)",
          color: "var(--color-text-secondary, #6B7280)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: "0.875rem",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {conversation.counterpart_avatar ? (
          <img src={String(conversation.counterpart_avatar)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials(name)
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: "var(--color-text, #111827)", fontSize: "var(--font-size-base, 0.875rem)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{name}</span>
          <span style={{ fontSize: "var(--font-size-xs, 0.75rem)", color: "var(--color-text-muted, #9CA3AF)", flexShrink: 0, whiteSpace: "nowrap" }}>{time}</span>
        </span>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "var(--font-size-sm, 0.8125rem)", color: unread ? "var(--color-text, #111827)" : "var(--color-text-muted, #6B7280)", fontWeight: unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
            {last || "—"}
          </span>
          <UnreadBadge count={unread} />
        </span>
      </span>
    </button>
  );
}
