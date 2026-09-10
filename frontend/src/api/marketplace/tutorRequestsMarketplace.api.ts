import { apiClient } from "../http";
import type { HttpResult } from "../client/responseParser";

export interface TutorRequestDto {
  id: string;
  tutorProfileId: string;
  tutorProfileSlug: string;
  tutorUserId: string;
  studentUserId?: string | null;
  studentName: string;
  studentContact: string;
  message?: string | null;
  status: "NEW" | "VIEWED" | "CONTACTED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const tutorRequestsMarketplaceApi = {
  // student: my sent requests
  myAsStudent: (page = 0, size = 20): Promise<HttpResult<PageResponse<TutorRequestDto>>> =>
    apiClient.get<PageResponse<TutorRequestDto>>(`/api/v1/tutor-requests/me?page=${page}&size=${size}`),

  // tutor: incoming requests
  myAsTutor: (page = 0, size = 20): Promise<HttpResult<PageResponse<TutorRequestDto>>> =>
    apiClient.get<PageResponse<TutorRequestDto>>(`/api/v1/tutors/me/requests?page=${page}&size=${size}`),

  // generic (auth required, returns own)
  list: (page = 0, size = 20): Promise<HttpResult<PageResponse<TutorRequestDto>>> =>
    apiClient.get<PageResponse<TutorRequestDto>>(`/api/v1/tutor-requests?page=${page}&size=${size}`),

  create: (payload: { tutorProfileId: string; studentName: string; studentContact: string; message?: string }): Promise<HttpResult<TutorRequestDto>> =>
    apiClient.post<TutorRequestDto>("/api/v1/tutor-requests", payload),

  markViewed: (id: string): Promise<HttpResult<TutorRequestDto>> =>
    apiClient.post<TutorRequestDto>(`/api/v1/tutor-requests/${id}/viewed`, {}),

  updateStatus: (id: string, status: TutorRequestDto["status"]): Promise<HttpResult<TutorRequestDto>> =>
    apiClient.request<TutorRequestDto>("PATCH", `/api/v1/tutor-requests/${id}`, { status }),

  // alias POST /status
  updateStatusPost: (id: string, status: string): Promise<HttpResult<TutorRequestDto>> =>
    apiClient.post<TutorRequestDto>(`/api/v1/tutor-requests/${id}/status`, { status }),
};
