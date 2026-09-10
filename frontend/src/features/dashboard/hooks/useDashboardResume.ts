import { useQuery } from "@tanstack/react-query";
import { tutorProfileMarketplaceApi, type TutorProfileMeResponse } from "../../../api/marketplace/tutorProfileMarketplace.api";

export function useDashboardResume(enabled = true) {
  return useQuery<TutorProfileMeResponse | null, Error>({
    queryKey: ["tutorProfile", "me"],
    queryFn: async () => {
      const res = await tutorProfileMarketplaceApi.me();
      if (res.response.ok) {
        return res.data as TutorProfileMeResponse;
      }
      if (res.response.status === 404) {
        return null;
      }
      const msg = (res.data as unknown as Record<string, unknown>)?.["message"] as string | undefined;
      throw new Error(msg || "Failed to load resume");
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
