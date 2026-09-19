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
  educationDetails?: string | null;
  experienceYears?: number | null;
  priceFrom?: string | number | null;
  priceTo?: string | number | null;
  currency: string;
  online: boolean;
  offline: boolean;
  city?: { id: string; slug: string; nameRu: string } | null;
  district?: { id: string; slug: string; nameRu: string } | null;
  phone?: string | null;
  status: "DRAFT" | "PENDING_MODERATION" | "PUBLISHED" | "REJECTED" | "SUSPENDED" | "EXPIRED" | "HIDDEN" | "ARCHIVED" | "ACTIVE" | "DELETED";
  statusLabel?: string;
  rejectionReason?: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  lastActiveAt?: string | null;
  hiddenAt?: string | null;
  archivedAt?: string | null;
  expiringSoon?: boolean;
  noindex?: boolean;
  rating?: number;
  reviewsCount?: number;
  achievements?: string[];
  educationList?: { institution: string; specialty: string; years: string }[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  photoUrl?: string | null;
  fullName?: string;
  isVerified?: boolean;
  subjects: { id: string; slug: string; nameRu: string }[];
  levels: { id: string; slug: string; nameRu: string }[];
  languages: string[];
}

export const tutorProfileMarketplaceApi = {
  me: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.get<TutorProfileMeResponse>("/api/v1/tutors/me"),

  // Owner preview: renders the resume exactly as users see it (public form),
  // available for any moderation status.
  preview: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.get<TutorProfileMeResponse>("/api/v1/tutors/me/preview"),

  status: (): Promise<HttpResult<Record<string, unknown>>> =>
    apiClient.get<Record<string, unknown>>("/api/v1/tutors/me/status"),

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

  hide: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>("/api/v1/tutors/me/hide", {}),

  restore: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>("/api/v1/tutors/me/restore", {}),

  renew: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>("/api/v1/tutors/me/renew", {}),

  publish: (id: string): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>(`/api/v1/resumes/${encodeURIComponent(id)}/publish`, {}),

  renewById: (id: string): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.post<TutorProfileMeResponse>(`/api/v1/resumes/${encodeURIComponent(id)}/renew`, {}),

  // alias for legacy /tutor-profiles/me
  meLegacy: (): Promise<HttpResult<TutorProfileMeResponse>> =>
    apiClient.get<TutorProfileMeResponse>("/api/v1/tutor-profiles/me"),
};
