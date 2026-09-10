import { apiClient } from "../http";
import type { HttpResult } from "../client/responseParser";

export interface TutorProfileMeResponse {
  id: string;
  userId: string;
  slug: string;
  firstName: string;
  lastName?: string;
  title?: string;
  shortDescription?: string;
  about?: string;
  tutorType: string;
  education?: string;
  university?: string;
  priceFrom?: string | number;
  priceTo?: string | number;
  currency: string;
  online: boolean;
  offline: boolean;
  city?: { id: string; slug: string; nameRu: string } | null;
  district?: { id: string; slug: string; nameRu: string } | null;
  phone?: string | null;
  status: "DRAFT" | "PENDING_MODERATION" | "PUBLISHED" | "REJECTED" | "SUSPENDED";
  rejectionReason?: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  subjects: { id: string; slug: string; nameRu: string }[];
  levels: { id: string; slug: string; nameRu: string }[];
  languages: string[];
}

export const tutorProfileMarketplaceApi = {
  me: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.get<TutorProfileMeResponse>("/api/v1/tutors/me"),

  bySlug: (slug: string): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.get<TutorProfileMeResponse>(`/api/v1/tutors/${encodeURIComponent(slug)}`),

  create: (payload: Record<string, unknown>): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>("/api/v1/tutors", payload),

  updateMe: (payload: Record<string, unknown>): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.put<TutorProfileMeResponse>("/api/v1/tutors/me", payload),

  submit: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>("/api/v1/tutors/me/submit", {}),

  deleteMe: (): Promise<HttpResult<unknown>> =>
    apiClient.request("DELETE", "/api/v1/tutors/me"),

  // alias for legacy /tutor-profiles/me
  meLegacy: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.get<TutorProfileMeResponse>("/api/v1/tutor-profiles/me"),
};
