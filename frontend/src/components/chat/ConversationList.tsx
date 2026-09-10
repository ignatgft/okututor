import { useTranslation } from "react-i18next";
import type { ChatConversation } from "../../api/chat.api";
import ConversationItem from "./ConversationItem";
import ChatEmptyState from "./ChatEmptyState";

type Props = {
  conversations: ChatConversation[];
  activeId?: string | null;
  onSelect: (c: ChatConversation) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

function SkeletonList(): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }} aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--color-border-light, #F0F2F5)" }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "var(--radius-full, 999px)", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: "60%" }} />
            <div className="skeleton" style={{ height: 12, width: "85%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConversationList({ conversations, activeId, onSelect, loading, error, onRetry }: Props): JSX.Element {
  const { t } = useTranslation();

  if (loading) return <SkeletonList />;

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ color: "var(--color-danger, #EF4444)", marginBottom: 12, fontSize: "var(--font-size-sm)" }}>{error || t("chat.load_error", "Не удалось загрузить обращения")}</div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary" style={{ minHeight: 36 }}>
            {t("common.retry", "Попробовать снова")}
          </button>
        )}
      </div>
    );
  }

  if (!conversations.length) {
    return <ChatEmptyState variant="requests" />;
  }

  return (
    <div
      className="chat-convo-list"
      role="list"
      aria-label={t("chat.conversations", "Обращения") as string}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        background: "var(--color-surface, #fff)",
      }}
    >
      {conversations.map((c) => (
        <div key={String(c.id)} role="listitem">
          <ConversationItem conversation={c} active={String(c.id) === String(activeId)} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
