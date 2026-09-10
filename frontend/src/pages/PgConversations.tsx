import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../components/pageTitleContext";
import { Badge, Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import { apiClient } from "../api/http";
import useAuthStore from "../store/authStore";
import { useToast } from "../components/ui/Toast";

interface Conversation {
  id: string;
  requestId: string;
  status: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  otherParticipantId?: string | null;
  otherParticipantName?: string | null;
}
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

export default function PgConversations(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const toast = useToast();
  const { conversationId } = useParams();
  const setPageTitle = usePageTitle();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { setPageTitle(t("navbar.messages", "Чат") as string); }, [setPageTitle, t]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await apiClient.get("/api/v1/conversations?page=0&size=20");
      if (response.ok) {
        const content = (data as Record<string, unknown>)["content"] as Conversation[] ?? (Array.isArray(data) ? data as Conversation[] : []);
        setConversations(content);
      } else {
        setError((data as Record<string, unknown>)?.["message"] as string ?? t("common.error", "Ошибка") as string);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMessages = useCallback(async (id: string) => {
    setMsgLoading(true);
    try {
      const { response, data } = await apiClient.get(`/api/v1/conversations/${id}/messages?page=0&size=50`);
      if (response.ok) {
        const content = (data as Record<string, unknown>)["content"] as Message[] ?? [];
        // API returns DESC, show ASC for chat
        setMessages([...content].reverse());
        // mark read
        await apiClient.post(`/api/v1/conversations/${id}/read`, {});
      }
    } catch {
      // ignore
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (conversationId) void loadMessages(conversationId);
    else setMessages([]);
  }, [conversationId, loadMessages]);

  const send = async () => {
    if (!conversationId || !text.trim()) return;
    setSending(true);
    try {
      const { response, data } = await apiClient.post(`/api/v1/conversations/${conversationId}/messages`, { text: text.trim() });
      if (response.ok) {
        setText("");
        void loadMessages(conversationId);
        void loadConversations();
      } else {
        toast.error((data as Record<string, unknown>)?.["message"] as string ?? t("errors.default", "Ошибка") as string);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner label={t("common.loading", "Загрузка...") as string} />;
  if (error) return <ErrorState message={error} onRetry={loadConversations} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: conversationId ? "320px 1fr" : "1fr", gap: 16, height: "calc(100vh - 140px)" }}>
      <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--color-surface)" }}>
        <div style={{ padding: 12, borderBottom: "1px solid var(--color-border)", fontWeight: 700 }}>{t("conversations.title", "Чаты")}</div>
        {conversations.length === 0 ? (
          <div style={{ padding: 16 }}><EmptyState title={t("conversations.empty", "Пока нет чатов")} hint={t("conversations.empty_hint", "Чаты появляются после создания обращения.") as string} /></div>
        ) : (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {conversations.map(c => (
              <Link key={c.id} to={`/conversations/${c.id}`} style={{ display: "block", padding: 12, borderBottom: "1px solid var(--color-border)", background: c.id === conversationId ? "var(--color-bg-secondary)" : "transparent", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{c.otherParticipantName || c.requestId.slice(0, 8)}</span>
                  {c.unreadCount > 0 && <Badge status="NEW">{c.unreadCount}</Badge>}
                </div>
                {c.lastMessage && <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>{c.lastMessage}</div>}
                {c.lastMessageAt && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>{new Date(c.lastMessageAt).toLocaleDateString()}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {conversationId ? (
        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", display: "flex", flexDirection: "column", background: "var(--color-surface)", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gap: 12, alignContent: "start" }}>
            {msgLoading ? <Spinner label={t("common.loading", "Загрузка...") as string} /> : messages.length === 0 ? <EmptyState title={t("conversations.no_messages", "Пока нет сообщений")} /> : messages.map(m => {
              const isMe = String(m.senderId) === String(user?.id);
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "70%", padding: "8px 12px", borderRadius: 12, background: isMe ? "var(--color-primary)" : "var(--color-bg-secondary)", color: isMe ? "#fff" : "var(--color-text)" }}>
                    <div style={{ fontSize: "var(--font-size-xs)", opacity: 0.8 }}>{m.senderName} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    <div style={{ marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                    {m.readAt && <div style={{ fontSize: "var(--font-size-xs)", opacity: 0.7, marginTop: 4 }}>✓ {t("conversations.read", "прочитано")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 12, borderTop: "1px solid var(--color-border)", display: "flex", gap: 8 }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder={t("conversations.placeholder", "Напишите сообщение...") as string} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: 8 }} maxLength={2000} />
            <button className="btn-primary" onClick={send} disabled={sending || !text.trim()}>{t("conversations.send", "Отправить")}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-xl)", color: "var(--color-text-muted)" }}>
          {t("conversations.select", "Выберите чат")}
        </div>
      )}
    </div>
  );
}
