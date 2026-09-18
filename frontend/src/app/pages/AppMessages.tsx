import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConversations } from "../../features/chat/hooks/useConversations";
import { useMessages, useSendMessage, useMarkConversationRead } from "../../features/chat/hooks/useMessages";
import ConversationList from "../../components/chat/ConversationList";
import ChatWindow from "../../components/chat/ChatWindow";

export default function AppMessages(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId: cid } = useParams() as { conversationId?: string };
  const activeId = cid || null;

  useEffect(() => { document.title = "Сообщения — OkuTutor"; }, []);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const { data: conversations = [], isLoading: loading, error, refetch } = useConversations(true);
  const activeConversation = (conversations as unknown as { id: string }[]).find((c) => String(c.id) === String(activeId)) || null;

  const { data: messages = [], isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } = useMessages(activeId, Boolean(activeId));
  const sendMutation = useSendMessage(activeId);
  const markRead = useMarkConversationRead();

  useEffect(() => {
    if (activeId && activeConversation && (activeConversation as unknown as Record<string, unknown>)["unread_count"]) {
      void markRead.mutateAsync(activeId).catch(() => {});
    }
    if (activeId && messages.length > 0 && (activeConversation as unknown as Record<string, unknown>)?.["unread_count"]) {
      void markRead.mutateAsync(activeId).catch(() => {});
    }
  }, [activeId, activeConversation, messages.length, markRead]);

  const errorMsg = error ? (error as Error).message : null;
  const messagesErrorMsg = messagesError ? (messagesError as Error).message : null;

  const showList = !isMobile || !activeId;
  const showChat = !isMobile || Boolean(activeId);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? "calc(100dvh - 56px - var(--bottom-nav-height,64px) - 16px)" : "calc(100dvh - 96px)", maxHeight: isMobile ? "calc(100dvh - 56px)" : "calc(100dvh - 32px)", overflow: "hidden", background: "transparent", paddingBottom: isMobile ? "var(--bottom-nav-height,64px)" : undefined }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", border: "1px solid var(--color-border, #E5E7EB)", borderRadius: 12, background: "var(--color-surface, #fff)" }}>
        {showList && (
          <div style={{ display: "flex", flexDirection: "column", width: isMobile ? "100%" : 360, minWidth: isMobile ? "100%" : 320, maxWidth: isMobile ? "100%" : 420, borderRight: isMobile ? "none" : "1px solid var(--color-border, #E5E7EB)", minHeight: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border, #E5E7EB)", flexShrink: 0 }}>
              <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>{t("navigation.requests", "Обращения")}</h1>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #6B7280)", marginTop: 2 }}>{t("chat.list_subtitle", "Ваши диалоги")}</div>
            </div>
            <ConversationList conversations={conversations as unknown as never[]} activeId={activeId} onSelect={(c) => navigate(`/app/messages/${(c as unknown as { id: string }).id}`)} loading={loading} error={errorMsg} onRetry={() => void refetch()} />
          </div>
        )}
        {showChat && (
          <ChatWindow conversation={activeConversation as unknown as never} messages={messages as unknown as never[]} messagesLoading={Boolean(activeId) && messagesLoading} messagesError={messagesErrorMsg} onRetryMessages={() => void refetchMessages()} onSend={async (body: string) => { await sendMutation.mutateAsync(body.trim()); }} sending={sendMutation.isPending} sendError={sendMutation.error ? (sendMutation.error as Error).message : null} onBack={isMobile && activeId ? () => navigate("/app/messages") : undefined} />
        )}
      </div>
    </div>
  );
}
