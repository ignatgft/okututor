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

function ChatHeader({ conversation, onBack }: { conversation: ChatConversation; onBack?: () => void }): JSX.Element {
  const { t } = useTranslation();
  const name = (conversation.counterpart_name as string | null) || t("chat.counterpart", "Собеседник") as string;
  const subtitle = (conversation.last_message as string | null) ? "" : (conversation.created_at as string | null) ? new Date(conversation.created_at as string).toLocaleDateString() : "";

  return (
    <div
      className="chat-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px var(--space-4, 16px)",
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: "var(--color-text, #111827)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {subtitle && <div style={{ fontSize: "var(--font-size-xs, 0.75rem)", color: "var(--color-text-muted, #6B7280)" }}>{subtitle}</div>}
      </div>
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
