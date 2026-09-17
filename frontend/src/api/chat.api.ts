/**
 * Chat API — marketplace chat (spec §10, §3)
 * Использует существующий apiClient (src/api/http.ts), не создаёт второй клиент.
 * Backend source of truth: ChatController (/api/v1/conversations) + TutorRequest → Conversation
 * Spec preferred model now matches real backend: GET /conversations etc.
 * Legacy fallback to /api/v1/messages/conversations kept for backward compat, but not used for marketplace.
 */
import { apiClient } from "./http";
import type { HttpResult } from "./client/responseParser";

export interface ChatConversation {
  id: string;
  type?: string;
  counterpart_name?: string | null;
  counterpart_avatar?: string | null;
  counterpart_id?: string;
  last_message?: string | null;
  last_message_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  unread_count?: number;
  // extended from MessagingService.ConversationResponse
  tutorProfileSlug?: string | null;
  tutorProfileId?: string | null;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  conversationId?: string;
  sender_id?: string;
  senderId?: string;
  body: string;
  text?: string;
  created_at?: string;
  createdAt?: string;
  own?: boolean;
  is_own?: boolean;
  read_at?: string | null;
  readAt?: string | null;
  sender_name?: string;
  senderName?: string;
  [key: string]: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data["content"])) return data["content"] as unknown[];
  if (isRecord(data) && Array.isArray(data["messages"])) return data["messages"] as unknown[];
  if (isRecord(data) && Array.isArray(data["items"])) return data["items"] as unknown[];
  return [];
}

export const chatApi = {
  /**
   * GET /api/v1/conversations?page=&size=
   * Preferred spec + real backend ChatController
   */
  listConversations(page = 0, size = 20): Promise<HttpResult<ChatConversation[]>> {
    const url = `/api/v1/conversations?page=${page}&size=${size}`;
    return apiClient.get<unknown>(url).then((res) => {
      const list = unwrapList(res.data) as ChatConversation[];
      // backend returns Page<ChatConversationResponse> → content, but unwrap handles it
      // Map backend fields to frontend ChatConversation shape
      const mapped = list.map((item) => {
        const r = item as unknown as Record<string, unknown>;
        return {
          id: String(r["id"] ?? r["conversationId"] ?? ""),
          // backend ChatConversationResponse: requestId, otherUserId, otherUserName, lastMessage, unreadCount etc
          counterpart_name: (r["otherUserName"] as string | undefined) ?? (r["counterpart_name"] as string | undefined) ?? null,
          counterpart_id: (r["otherUserId"] as string | undefined) ?? (r["counterpart_id"] as string | undefined) ?? undefined,
          last_message: (r["lastMessage"] as string | undefined) ?? (r["last_message"] as string | undefined) ?? null,
          last_message_at: (r["lastMessageAt"] as string | undefined) ?? (r["last_message_at"] as string | undefined) ?? null,
          updated_at: (r["updatedAt"] as string | undefined) ?? (r["updated_at"] as string | undefined) ?? null,
          created_at: (r["createdAt"] as string | undefined) ?? (r["created_at"] as string | undefined) ?? null,
          unread_count: (r["unreadCount"] as number | undefined) ?? (r["unread_count"] as number | undefined) ?? 0,
          requestId: r["requestId"] ?? r["request_id"],
          ...r,
        } as unknown as ChatConversation;
      });
      return { response: res.response, data: mapped };
    }) as Promise<HttpResult<ChatConversation[]>>;
  },

  /**
   * GET /api/v1/conversations/{id}
   */
  getConversation(id: string): Promise<HttpResult<ChatConversation>> {
    return apiClient.get<ChatConversation>(`/api/v1/conversations/${encodeURIComponent(id)}`).then((res) => {
      const r = res.data as unknown as Record<string, unknown>;
      if (r && typeof r === "object" && !Array.isArray(r) && r["id"]) {
        const mapped = {
          id: String(r["id"]),
          counterpart_name: (r["otherUserName"] as string | undefined) ?? (r["counterpart_name"] as string | undefined) ?? null,
          counterpart_id: (r["otherUserId"] as string | undefined) ?? undefined,
          last_message: (r["lastMessage"] as string | undefined) ?? null,
          last_message_at: (r["lastMessageAt"] as string | undefined) ?? null,
          updated_at: (r["updatedAt"] as string | undefined) ?? null,
          unread_count: (r["unreadCount"] as number | undefined) ?? 0,
          ...r,
        } as unknown as ChatConversation;
        return { response: res.response, data: mapped };
      }
      return res as HttpResult<ChatConversation>;
    }) as Promise<HttpResult<ChatConversation>>;
  },

  /**
   * GET /api/v1/conversations/{id}/messages?page=&size=
   * Paginated, spec requires page/size. Backend uses Page with sort DESC createdAt.
   */
  listMessages(conversationId: string, page = 0, size = 20): Promise<HttpResult<ChatMessage[]>> {
    const url = `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&size=${size}`;
    return apiClient.get<unknown>(url).then((res) => {
      const list = unwrapList(res.data) as unknown[];
      const mapped = list.map((item) => {
        const r = item as unknown as Record<string, unknown>;
        return {
          id: String(r["id"] ?? ""),
          conversation_id: String(r["conversationId"] ?? r["conversation_id"] ?? conversationId),
          sender_id: String(r["senderId"] ?? r["sender_id"] ?? ""),
          body: String(r["text"] ?? r["body"] ?? ""),
          text: String(r["text"] ?? r["body"] ?? ""),
          created_at: (r["createdAt"] as string | undefined) ?? (r["created_at"] as string | undefined) ?? null,
          createdAt: (r["createdAt"] as string | undefined) ?? null,
          read_at: (r["readAt"] as string | undefined) ?? (r["read_at"] as string | undefined) ?? null,
          sender_name: (r["senderName"] as string | undefined) ?? (r["sender_name"] as string | undefined) ?? null,
          ...r,
        } as unknown as ChatMessage;
      });
      // backend returns newest first (DESC), but UI expects chronological asc for display
      mapped.reverse();
      return { response: res.response, data: mapped };
    }) as Promise<HttpResult<ChatMessage[]>>;
  },

  /**
   * POST /api/v1/conversations/{id}/messages {text}
   * Validation: text required, trimmed != empty, max 2000 (backend @Size)
   */
  sendMessage(conversationId: string, body: string): Promise<HttpResult<ChatMessage>> {
    const trimmed = body.trim();
    if (!trimmed) return Promise.reject(new Error("Empty message"));
    if (trimmed.length > 2000) return Promise.reject(new Error("text must be <= 2000 characters"));
    return apiClient
      .post<unknown>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, { text: trimmed })
      .then((res) => {
        const r = res.data as unknown as Record<string, unknown>;
        const mapped = {
          id: String(r["id"] ?? ""),
          conversation_id: String(r["conversationId"] ?? conversationId),
          sender_id: String(r["senderId"] ?? ""),
          body: String(r["text"] ?? trimmed),
          text: String(r["text"] ?? trimmed),
          created_at: (r["createdAt"] as string | undefined) ?? new Date().toISOString(),
          ...r,
        } as unknown as ChatMessage;
        return { response: res.response, data: mapped };
      }) as Promise<HttpResult<ChatMessage>>;
  },

  /**
   * POST /api/v1/conversations/{id}/read
   */
  async markRead(conversationId: string): Promise<HttpResult<unknown>> {
    const url = `/api/v1/conversations/${encodeURIComponent(conversationId)}/read`;
    return apiClient.post<unknown>(url, {});
  },

  /**
   * GET /api/v1/conversations/unread-count
   */
  async unreadCount(): Promise<HttpResult<{ count: number }>> {
    const url = `/api/v1/conversations/unread-count`;
    try {
      const res = await apiClient.get<{ count: number }>(url);
      if (res.response.ok) return res as HttpResult<{ count: number }>;
    } catch {
      // fallback to sum
    }
    try {
      const conv = await chatApi.listConversations(0, 100);
      const sum = (conv.data as ChatConversation[]).reduce((acc, c) => acc + (c.unread_count ?? (c as unknown as Record<string, unknown>)["unreadCount"] as number ?? 0), 0);
      return { response: { ok: true } as Response, data: { count: sum } } as HttpResult<{ count: number }>;
    } catch {
      return { response: { ok: true } as Response, data: { count: 0 } } as HttpResult<{ count: number }>;
    }
  },

  /**
   * POST /api/v1/requests/{requestId}/conversation  (alias /tutor-requests/{id}/conversation)
   * Idempotent: returns existing if already exists (unique request_id).
   * Used for marketplace flow: TutorRequest → Conversation
   */
  async createOrGetConversationForRequest(requestId: string): Promise<HttpResult<ChatConversation>> {
    const candidates = [
      `/api/v1/requests/${encodeURIComponent(requestId)}/conversation`,
      `/api/v1/tutor-requests/${encodeURIComponent(requestId)}/conversation`,
    ];
    let lastError: unknown = null;
    for (const url of candidates) {
      try {
        const res = await apiClient.post<ChatConversation>(url, {});
        if (res.response.ok) return res;
        lastError = new Error((res.data as Record<string, unknown>)?.["message"] as string || `POST ${url} failed`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError ?? new Error("Failed to create conversation");
  },

  /**
   * Legacy: POST /api/v1/messages/conversations {user_id} — DIRECT (kept for support, not marketplace)
   */
  openConversation(counterpartUserId: string): Promise<HttpResult<ChatConversation>> {
    // This is legacy direct messaging, not marketplace request-based chat
    // Kept for backward compat, but marketplace should use createOrGetConversationForRequest
    return apiClient.post<ChatConversation>(`/api/v1/messages/conversations`, {
      user_id: counterpartUserId,
      type: "DIRECT",
    }) as Promise<HttpResult<ChatConversation>>;
  },
};
