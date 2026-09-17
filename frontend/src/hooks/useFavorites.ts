import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesApi } from "../api/favorites.api";
import useAuthStore from "../store/authStore";

export function useFavoriteIds(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["favorites", "ids"],
    queryFn: async () => {
      const { response, data } = await favoritesApi.ids();
      if (!response.ok) throw new Error((data as Record<string, unknown>)?.["message"] ?? "Failed to load favorites");
      return data as string[];
    },
    // не дергаем /favorites/ids для гостей — избегаем 401 спама (N карточек × 401)
    enabled: enabled && isAuthenticated,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useFavorites(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["favorites", "list"],
    queryFn: async () => {
      const { response, data } = await favoritesApi.list();
      if (!response.ok) throw new Error((data as Record<string, unknown>)?.["message"] ?? "Failed to load favorites");
      return data as Record<string, unknown>[];
    },
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, isFav }: { profileId: string; isFav: boolean }) => {
      const { response, data } = isFav
        ? await favoritesApi.remove(profileId)
        : await favoritesApi.add(profileId);
      if (!response.ok) throw new Error((data as Record<string, unknown>)?.["message"] ?? "Failed to toggle favorite");
      return { profileId, isFav: !isFav, data };
    },
    // оптимистично обновляем кеш ids без лишнего GET — мгновенно, без 2х рефетчей
    onMutate: async ({ profileId, isFav }) => {
      await qc.cancelQueries({ queryKey: ["favorites", "ids"] });
      const prev = qc.getQueryData<string[]>(["favorites", "ids"]);
      qc.setQueryData<string[]>(["favorites", "ids"], (old) => {
        const cur = old ?? prev ?? [];
        if (isFav) return cur.filter((id) => id !== profileId);
        if (cur.includes(profileId)) return cur;
        return [...cur, profileId];
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites", "ids"], ctx.prev);
    },
    onSuccess: () => {
      // список Избранного обновится лениво; ids уже актуален, инвалидируем только list
      qc.invalidateQueries({ queryKey: ["favorites", "list"] });
    },
  });
}
