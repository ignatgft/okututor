import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { chatApi, type ChatMessage } from "../../../api/chat.api";

/**
 * Spec §9: useMessages(id) — polling только на активном chat screen
 */
export function useMessages(conversationId: string | null, enabled = true) {
  const query = useQuery<ChatMessage[], Error>({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await chatApi.listMessages(conversationId);
      if (!res.response.ok) {
        const msg = (res.data as unknown as Record<string, unknown>)?.["message"] as string | undefined;
        throw new Error(msg || "Не удалось загрузить сообщения");
      }
      return res.data as ChatMessage[];
    },
    enabled: Boolean(conversationId) && enabled,
    // Spec §15: refetchInterval только на активном экране, stop когда покидает
    refetchInterval: conversationId ? 4000 : false,
    refetchIntervalInBackground: false,
    staleTime: 2000,
    retry: 1,
  });

  return query;
}

/**
 * Spec §9: useSendMessage() — POST → invalidate/refetch (просто и корректно, вместо сложного optimistic)
 */
export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation<ChatMessage, Error, string>({
    mutationFn: async (body: string) => {
      if (!conversationId) throw new Error("No conversation");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Empty message");
      const res = await chatApi.sendMessage(conversationId, trimmed);
      if (!res.response.ok) {
        const msg = (res.data as unknown as Record<string, unknown>)?.["message"] as string | undefined;
        throw new Error(msg || "Failed to send");
      }
      return res.data as ChatMessage;
    },
    onSuccess: () => {
      if (conversationId) {
        void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
  });
}

/**
 * Spec §9: useMarkConversationRead()
 */
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: async (conversationId: string) => {
      const res = await chatApi.markRead(conversationId);
      if (!res.response.ok && res.response.status !== 404) {
        throw new Error("Failed to mark read");
      }
      return res.data;
    },
    onSuccess: (_data, conversationId) => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      void qc.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}
