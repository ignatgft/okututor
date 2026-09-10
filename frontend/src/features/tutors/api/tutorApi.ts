import { endpoints } from "../../../api/endpoints";
import { apiClient } from "../../../api/http";
import type { HttpResult } from "../../../api/client/responseParser";

const withQuery = (
  base: string,
  params: URLSearchParams | Record<string, unknown> | null | undefined
): string => {
  if (!params) return base;
  const query =
    params instanceof URLSearchParams
      ? params.toString()
      : new URLSearchParams(
          Object.entries(params as Record<string, unknown>)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => [k, String(v)] as [string, string])
        ).toString();
  return query ? `${base}?${query}` : base;
};

/**
 * Marketplace tutor API — all via apiClient (no raw fetch in components)
 */
export const tutorApi = {
  /** Public search tutors — GET /api/v1/search/tutors?q=&subject=&city=&price_min=&page=&size= */
  search: (
    params: URLSearchParams | Record<string, unknown>,
    signal: AbortSignal | null = null
  ): Promise<HttpResult<unknown>> =>
    apiClient.request("GET", withQuery(endpoints.search.tutors, params), null, false, false, signal),

  /** List tutors — fallback if search not available */
  list: (query = ""): Promise<HttpResult<unknown>> =>
    apiClient.get<unknown>(`${endpoints.users.tutors}${query}`, false),

  /** By slug or id — tries slug endpoint, fallback to byId */
  bySlug: async (slug: string | number): Promise<HttpResult<unknown>> => {
    // try /tutors/slug/{slug} if backend supports, else /users/{id} / /tutors/{id}
    try {
      const res = await apiClient.get<unknown>(`/api/v1/tutors/slug/${encodeURIComponent(String(slug))}`, false);
      if (res.response.ok) return res;
    } catch {
      // ignore
    }
    return apiClient.get<unknown>(endpoints.tutors.byId(slug), false);
  },

  byId: (id: string | number): Promise<HttpResult<unknown>> =>
    apiClient.get(endpoints.tutors.byId(id), false),

  /** Current user's tutor profile (for editor) */
  myProfile: (): Promise<HttpResult<unknown>> =>
    apiClient.get(endpoints.tutors.myApplication ?? "/api/v1/tutors/me"),

  myApplication: (): Promise<HttpResult<unknown>> =>
    apiClient.get(endpoints.tutors.myApplication),

  submitApplication: (payload: Record<string, unknown>): Promise<HttpResult<unknown>> =>
    apiClient.post(endpoints.tutors.applications, payload),

  updateApplication: (payload: Record<string, unknown>): Promise<HttpResult<unknown>> =>
    apiClient.put(endpoints.tutors.myApplication, payload),

  submitModeration: (id: string | number): Promise<HttpResult<unknown>> =>
    apiClient.post(`/api/v1/tutors/${id}/submit`, {}),
};

export const cityApi = {
  list: async (): Promise<string[]> => {
    try {
      const res = await apiClient.get<unknown>("/api/v1/cities", false);
      if (res.response.ok && Array.isArray(res.data)) return res.data as string[];
      if (res.response.ok && res.data && typeof res.data === "object" && Array.isArray((res.data as Record<string, unknown>)["content"])) {
        return (res.data as Record<string, unknown>)["content"] as string[];
      }
    } catch {
      // fallback
    }
    // fallback cities from constants/cities
    return ["Бишкек", "Ош", "Жалал-Абад", "Каракол", "Токмок", "Кара-Балта", "Кант", "Талас", "Нарын", "Баткен"];
  },
};

export const requestApi = {
  myAsStudent: (): Promise<HttpResult<unknown>> => apiClient.get("/api/v1/enrollments/my", true),
  myAsTutor: (): Promise<HttpResult<unknown>> => apiClient.get("/api/v1/enrollments/tutor", true),
};

export const adminApi = {
  tutors: (query = ""): Promise<HttpResult<unknown>> => apiClient.get(`/api/v1/admin/tutors${query}`),
  approveTutor: (id: string | number): Promise<HttpResult<unknown>> => apiClient.post(endpoints.admin.approveTutor(id)),
  rejectTutor: (id: string | number, reason: string): Promise<HttpResult<unknown>> => apiClient.post(endpoints.admin.rejectTutor(id), { rejection_reason: reason, reason }),
  pendingTutors: (): Promise<HttpResult<unknown>> => apiClient.get("/api/v1/admin/tutors?status=PENDING"),
};
