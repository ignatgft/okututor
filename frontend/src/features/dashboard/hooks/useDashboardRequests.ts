import { useQuery } from "@tanstack/react-query";
import { tutorRequestsMarketplaceApi, type TutorRequestDto } from "../../../api/marketplace/tutorRequestsMarketplace.api";

function toList(data: unknown): TutorRequestDto[] {
  if (Array.isArray(data)) return data as TutorRequestDto[];
  if (typeof data === "object" && data !== null) {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec["content"])) return rec["content"] as TutorRequestDto[];
    if (Array.isArray(rec["items"])) return rec["items"] as TutorRequestDto[];
  }
  return [];
}

export function useDashboardRequests(enabled = true) {
  return useQuery<TutorRequestDto[], Error>({
    queryKey: ["dashboard", "requests", "recent"],
    queryFn: async () => {
      // try myAsStudent first, fallback to list
      try {
        const res = await tutorRequestsMarketplaceApi.myAsStudent(0, 5);
        if (res.response.ok) return toList(res.data);
        if (res.response.status === 404) {
          const fb = await tutorRequestsMarketplaceApi.list(0, 5);
          if (fb.response.ok) return toList(fb.data);
        }
        const msg = (res.data as unknown as Record<string, unknown>)?.["message"] as string | undefined;
        throw new Error(msg || "Failed to load requests");
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(String(e));
      }
    },
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}
