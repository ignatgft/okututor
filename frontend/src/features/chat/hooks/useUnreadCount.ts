import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../../../api/chat.api";

/**
 * Spec §9, §14: useUnreadCount() — для navigation badge "Обращения ③"
 */
export function useUnreadCount(enabled = true) {
  return useQuery<number, Error>({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      const res = await chatApi.unreadCount();
      if (!res.response.ok) throw new Error("Failed to load unread");
      return (res.data as { count: number }).count ?? 0;
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}
