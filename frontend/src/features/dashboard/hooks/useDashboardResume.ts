import { useQuery } from "@tanstack/react-query";
import { tutorProfileMarketplaceApi, type TutorProfileMeResponse } from "../../../api/marketplace/tutorProfileMarketplace.api";

export function useDashboardResume(enabled = true, opts?: { refetchInterval?: number | false }) {
  return useQuery<TutorProfileMeResponse | null, Error>({
    queryKey: ["tutorProfile", "me"],
    queryFn: async () => {
      try {
        const res = await tutorProfileMarketplaceApi.me();
        if (res.response.ok) {
          return res.data as TutorProfileMeResponse;
        }
        if (res.response.status === 404) {
          return null;
        }
        const data = res.data as unknown as Record<string, unknown>;
        const msg = (data?.["message"] as string) || (data?.["error"] as string);
        if (res.response.status === 404 || (msg && msg.toLowerCase().includes("not found"))) {
          return null;
        }
        throw new Error(msg || "Failed to load resume");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
          return null;
        }
        throw e;
      }
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // live sync: poll раз в 60s только когда вкладка видима — без спама на каждый фокус
    refetchInterval: opts?.refetchInterval ?? (enabled ? 60_000 : false),
    refetchIntervalInBackground: false,
    retry: false,
  });
}
