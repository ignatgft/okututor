import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChatConversation } from "../../api/chat.api";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatEmptyState from "./ChatEmptyState";
import type { ChatMessage } from "../../api/chat.api";

type Props = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  messagesLoading?: boolean;
  messagesError?: string | null;
  onRetryMessages?: () => void;
  onSend: (body: string) => Promise<void>;
  sending?: boolean;
  sendError?: string | null;
  onBack?: () => void;
  // for mobile/desktop layout control, parent decides visibility
};

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 50%)`;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function normalizeAvatar(url?: string | null): string | null {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith("http")) {
    // R2 pub URL -> proxy via backend
    if (s.includes("r2.dev") || s.includes("r2.cloudflarestorage.com")) {
      return s; // backend will proxy, but keep as is for now
    }
    return s;
  }
  if (s.startsWith("/")) return s;
  return `/${s.replace(/^\/+/, "")}`;
}

function ChatHeader({ conversation, onBack }: { conversation: ChatConversation; onBack?: () => void }): JSX.Element {
  const { t } = useTranslation();
  const name = (conversation.counterpart_name as string | null) || t("chat.counterpart", "Собеседник") as string;
  const avatarUrl = normalizeAvatar((conversation.counterpart_avatar as string | null) || (conversation.other_participant_avatar_url as string | null) || null);
  const slug = (conversation.counterpart_slug as string | null) || (conversation.tutorProfileSlug as string | null) || (conversation.other_participant_slug as string | null) || null;
  const profileId = (conversation.tutorProfileId as string | null) || null;
  // Correct routes: /repetitor/:slug for slug, /tutor/:tutorId for id, never /profile/:id (404)
  const targetPath = slug ? `/repetitor/${slug}` : profileId ? `/tutor/${profileId}` : conversation.counterpart_id ? `/tutor/${conversation.counterpart_id}` : null;

  const handleOpenProfile = () => {
    if (targetPath) window.location.assign(targetPath);
  };

  return (
    <div
      className="chat-header tg-chat-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderBottom: "1px solid var(--color-border, #E5E7EB)",
        background: "var(--color-surface, #fff)",
        minHeight: 56,
        flexShrink: 0,
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("common.back", "Назад") as string}
          className="btn-ghost"
          style={{ minWidth: 36, minHeight: 36, width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-full)" }}
        >
          ←
        </button>
      )}
      {/* TG avatar */}
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: avatarColor(name),
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          initials(name)
        )}
      </span>
      {/* Clickable info */}
      <div
        onClick={targetPath ? handleOpenProfile : undefined}
        role={targetPath ? "button" : undefined}
        tabIndex={targetPath ? 0 : undefined}
        onKeyDown={targetPath ? (e) => e.key === "Enter" && handleOpenProfile() : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: targetPath ? "pointer" : "default",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
        title={targetPath ? (t("chat.open_profile", "Открыть профиль") as string) : undefined}
      >
        <div
          style={{
            fontWeight: 700,
            color: "var(--color-text, #111827)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "0.95rem",
            lineHeight: 1.2,
          }}
        >
          {name}
          {targetPath && <span style={{ marginLeft: 6, fontSize: 12, color: "var(--color-text-muted)" }}>↗</span>}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-success, #16a34a)", lineHeight: 1 }}>
          {t("chat.online", "в сети")}
        </div>
      </div>
      {/* More button placeholder */}
      <button type="button" aria-label="more" style={{ width: 36, height: 36, borderRadius: 999, border: "none", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
        ⋮
      </button>
    </div>
  );
}

export default function ChatWindow({ conversation, messages, messagesLoading, messagesError, onRetryMessages, onSend, sending, sendError, onBack }: Props): JSX.Element {
  const { t } = useTranslation();
  const [quickDraft, setQuickDraft] = useState<string | null>(null);

  if (!conversation) {
    return (
      <div
        className="chat-window chat-window--empty"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg-secondary, #F7F9FC)",
          borderLeft: "1px solid var(--color-border, #E5E7EB)",
        }}
      >
        <ChatEmptyState variant="chat" />
      </div>
    );
  }

  return (
    <div
      className="chat-window"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg, #fff)",
        borderLeft: "1px solid var(--color-border, #E5E7EB)",
        minWidth: 0,
      }}
    >
      <ChatHeader conversation={conversation} onBack={onBack} />

      {messagesLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="skeleton" style={{ width: "60%", height: 120, borderRadius: 12 }} />
        </div>
      ) : messagesError ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 12 }}>
          <div style={{ color: "var(--color-danger, #EF4444)" }}>{messagesError || t("chat.messages_error", "Не удалось загрузить сообщения")}</div>
          {onRetryMessages && <button type="button" onClick={onRetryMessages} className="btn-secondary">{t("common.retry", "Попробовать снова")}</button>}
        </div>
      ) : messages.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
          <ChatEmptyState variant="chat" />
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("chat.quick_title", "Здравствуйте! Что вы хотите узнать?")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {[
                { label: t("chat.quick_price", "Узнать цену"), text: "Здравствуйте! Подскажите, пожалуйста, стоимость занятий." },
                { label: t("chat.quick_schedule", "Узнать расписание"), text: "Здравствуйте! Подскажите, пожалуйста, ваше расписание." },
                { label: t("chat.quick_book", "Хочу записаться"), text: "Здравствуйте! Хочу записаться к вам на занятия." },
              ].map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => setQuickDraft(qa.text)}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: "6px 12px", borderRadius: 20 }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} />
      )}

      <MessageInput onSend={onSend} loading={sending} error={sendError} disabled={!conversation} initialValue={quickDraft} onQuickDraftUsed={() => setQuickDraft(null)} />
    </div>
  );
}
