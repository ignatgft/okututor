import { useQuery } from "@tanstack/react-query";
import { chatApi, type ChatConversation } from "../../../api/chat.api";

/**
 * Server state via React Query — не Zustand.
 * Spec §9: useConversations()
 */
export function useConversations(enabled = true) {
  return useQuery<ChatConversation[], Error>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await chatApi.listConversations();
      if (!res.response.ok) {
        const msg = (res.data as unknown as Record<string, unknown>)?.["message"] as string | undefined;
        throw new Error(msg || "Failed to load conversations");
      }
      return res.data as ChatConversation[];
    },
    enabled,
    staleTime: 10_000,
    // polling только если нужно — но для списка не делаем постоянный polling (spec §15: только на активном чате)
    refetchInterval: false,
    retry: 1,
  });
}
