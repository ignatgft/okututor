/**
 * Marketplace Chat Pages — /dashboard/requests and /dashboard/requests/:id
 * Desktop: 2-pane (list + chat), Mobile: list OR chat with back
 * Uses existing API client + React Query, not Zustand for messages
 */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConversations } from "../features/chat/hooks/useConversations";
import { useMessages, useSendMessage, useMarkConversationRead } from "../features/chat/hooks/useMessages";
import { usePageTitle } from "../components/pageTitleContext";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";

export default function PgMarketplaceChat(): JSX.Element {
  const { t } = useTranslation();
  const setPageTitle = usePageTitle();
  const navigate = useNavigate();
  const params = useParams() as Record<string, string | undefined>;
  // support both :requestId and :id and :conversationId
  const conversationId = params.requestId || params.id || params.conversationId || null;

  useEffect(() => { setPageTitle(t("navigation.requests", "Обращения") as string); }, [setPageTitle, t]);

  const { data: conversations = [], isLoading: loading, error, refetch } = useConversations(true);
  const activeId = conversationId || null;
  const activeConversation = (conversations as unknown as { id: string }[]).find((c) => String(c.id) === String(activeId)) || null;

  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useMessages(activeId, Boolean(activeId));

  const sendMutation = useSendMessage(activeId);
  const markRead = useMarkConversationRead();

  // mark as read when opening (spec §14)
  useEffect(() => {
    if (activeId && activeConversation && (activeConversation as unknown as Record<string, unknown>)["unread_count"]) {
      const unread = (activeConversation as unknown as Record<string, unknown>)["unread_count"] as number | undefined;
      if (unread && unread > 0) {
        void markRead.mutateAsync(activeId).catch(() => {});
      }
    }
    // also mark on messages load (backend source of truth)
    if (activeId && messages.length > 0) {
      // if any unread for viewer, mark read after short delay (stop polling when leave will auto stop)
      const hasUnread = (activeConversation as unknown as Record<string, unknown>)?.["unread_count"];
      if (hasUnread) void markRead.mutateAsync(activeId).catch(() => {});
    }
  }, [activeId, activeConversation, messages.length, markRead]);

  const handleSelect = (c: { id: string }) => {
    navigate(`/dashboard/requests/${c.id}`);
  };

  const handleBack = () => {
    navigate("/dashboard/requests");
  };

  const handleSend = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) throw new Error("Empty");
    await sendMutation.mutateAsync(trimmed);
    // polling will refetch, but we also invalidate via hook
  };

  // Responsive: desktop shows both, mobile shows list or chat
  // We use CSS to handle desktop 2-pane vs mobile single; JS also decides initial view
  const isMobileView = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const showList = !isMobileView || !activeId;
  const showChat = !isMobileView || Boolean(activeId);

  const errorMsg = error ? (error as Error).message : null;
  const messagesErrorMsg = messagesError ? (messagesError as Error).message : null;

  // When inside UserDashboardLayout (sidebar), we want chat to appear to the right of sidebar like settings.
  // Detect layout context via window width still, but adjust container to fill dashboard content area.
  const isInsideDashboard = true; // now always inside UserDashboardLayout for /dashboard/requests
  return (
    <div
      className="marketplace-chat-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: isMobileView
          ? "calc(100dvh - 56px - var(--bottom-nav-height, 64px) - 16px)"
          : "calc(100dvh - 96px)",
        maxHeight: isMobileView
          ? "calc(100dvh - 56px)"
          : "calc(100dvh - 32px)",
        overflow: "hidden",
        background: isInsideDashboard ? "transparent" : "var(--color-bg, #F7F9FC)",
        margin: isInsideDashboard ? 0 : undefined,
        padding: isInsideDashboard ? 0 : undefined,
      }}
    >
      <div
        className="marketplace-chat-layout"
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          maxHeight: "100%",
          overflow: "hidden",
          border: "1px solid var(--color-border, #E5E7EB)",
          borderRadius: "var(--radius-xl, 12px)",
          background: "var(--color-surface, #fff)",
          margin: isInsideDashboard ? 0 : "16px",
          // when inside dashboard, fill content area; on mobile full bleed handled by DashboardLayout padding
        }}
      >
        {/* List pane */}
        {showList && (
          <div
            className="marketplace-chat-list-pane"
            style={{
              display: "flex",
              flexDirection: "column",
              width: isMobileView ? "100%" : "360px",
              minWidth: isMobileView ? "100%" : "320px",
              maxWidth: isMobileView ? "100%" : "420px",
              borderRight: isMobileView ? "none" : "1px solid var(--color-border, #E5E7EB)",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid var(--color-border, #E5E7EB)",
                background: "var(--color-surface, #fff)",
                flexShrink: 0,
              }}
            >
              <h1 style={{ margin: 0, fontSize: "var(--font-size-lg, 1.125rem)", fontWeight: 700 }}>{t("navigation.requests", "Обращения")}</h1>
              <div style={{ fontSize: "var(--font-size-xs, 0.75rem)", color: "var(--color-text-muted, #6B7280)", marginTop: 2 }}>
                {t("chat.list_subtitle", "Ваши диалоги с репетиторами и учениками")}
              </div>
            </div>
            <ConversationList
              conversations={conversations as unknown as never[]}
              activeId={activeId}
              onSelect={(c) => handleSelect(c as unknown as { id: string })}
              loading={loading}
              error={errorMsg}
              onRetry={() => void refetch()}
            />
          </div>
        )}

        {/* Chat pane */}
        {showChat && (
          <ChatWindow
            conversation={activeConversation as unknown as never}
            messages={messages as unknown as never[]}
            messagesLoading={Boolean(activeId) && messagesLoading}
            messagesError={messagesErrorMsg}
            onRetryMessages={() => void refetchMessages()}
            onSend={handleSend}
            sending={sendMutation.isPending}
            sendError={sendMutation.error ? (sendMutation.error as Error).message : null}
            onBack={isMobileView && activeId ? handleBack : undefined}
          />
        )}
      </div>
    </div>
  );
}
