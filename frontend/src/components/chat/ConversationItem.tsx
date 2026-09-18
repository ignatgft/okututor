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

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 50%)`;
}

function normalizeAvatar(url?: string | null): string | null {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith("http") || s.startsWith("/")) return s;
  return `/${s.replace(/^\/+/, "")}`;
}

export default function ConversationItem({ conversation, active, onSelect }: Props): JSX.Element {
  const rawName = (conversation.counterpart_name as string | null) || (conversation.counterpart_slug as string | null) || "Собеседник";
  const name = rawName.trim() || "Собеседник";
  const last = (conversation.last_message as string | null) || "";
  const time = formatTime((conversation.last_message_at as string | null) || (conversation.updated_at as string | null) || (conversation.created_at as string | null));
  const unread = conversation.unread_count ?? 0;
  const avatarUrl = normalizeAvatar((conversation.counterpart_avatar as string | null) || (conversation.other_participant_avatar_url as string | null) || null);

  const preview = last ? (last.length > 40 ? `${last.slice(0, 40)}…` : last) : "Нет сообщений";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`tg-convo ${active ? "tg-convo--active" : ""}`}
      style={{
        display: "flex",
        gap: 12,
        width: "100%",
        padding: "10px 14px",
        textAlign: "left",
        background: active ? "var(--color-primary-soft, #E0E7FF)" : "var(--color-surface, #fff)",
        border: "none",
        borderBottom: "1px solid var(--color-border-light, #F0F2F5)",
        cursor: "pointer",
        alignItems: "center",
        minHeight: 68,
        transition: "background 0.15s",
      }}
      aria-current={active ? "true" : undefined}
    >
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: avatarUrl ? "var(--color-bg-secondary, #E5E7EB)" : avatarColor(name),
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.9rem",
          flexShrink: 0,
          overflow: "hidden",
          border: unread ? "2px solid var(--color-primary, #3563E9)" : "none",
        }}
      >
        {avatarUrl ? (
          <img loading="lazy" decoding="async" src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          initials(name)
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "var(--color-text, #111827)", fontSize: "0.925rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, letterSpacing: "-0.01em" }}>{name}</span>
          <span style={{ fontSize: "0.75rem", color: unread ? "var(--color-primary, #3563E9)" : "var(--color-text-muted, #9CA3AF)", flexShrink: 0, whiteSpace: "nowrap", fontWeight: unread ? 600 : 400 }}>{time}</span>
        </span>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "0.8125rem", color: unread ? "var(--color-text, #111827)" : "var(--color-text-muted, #6B7280)", fontWeight: unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, lineHeight: 1.3 }}>
            {preview}
          </span>
          {unread > 0 ? <UnreadBadge count={unread} /> : <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-success, #16a34a)", flexShrink: 0, opacity: 0.0 }} aria-hidden="true" />}
        </span>
      </span>
    </button>
  );
}
