import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../api/chat.api";
import MessageBubble from "./MessageBubble";
import useAuthStore from "../../store/authStore";

type Props = {
  messages: ChatMessage[];
};

export default function MessageList({ messages }: Props): JSX.Element {
  const { user } = useAuthStore();
  const currentUserId = String(user?.id ?? "");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // auto scroll to bottom on new messages (but respect if user scrolled up? minimal: always scroll for MVP)
    const el = bottomRef.current as unknown as { scrollIntoView?: (opts?: unknown) => void } | null;
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "end" } as unknown as never);
  }, [messages]);

  // Also scroll container to bottom on mount
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={listRef}
      className="chat-message-list"
      role="log"
      aria-live="polite"
      aria-label="Сообщения чата"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        padding: "12px 0",
        background: "var(--color-bg-secondary, #F7F9FC)",
        overscrollBehavior: "contain",
      }}
    >
      {messages.map((m) => {
        const senderId = String((m.sender_id as string | undefined) || (m.senderId as string | undefined) || "");
        const isOwn = Boolean((m as unknown as Record<string, unknown>)["own"] ?? (m as unknown as Record<string, unknown>)["is_own"] ?? (currentUserId && senderId === currentUserId));
        return <MessageBubble key={String(m.id)} message={m} isOwn={isOwn} />;
      })}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
