import { apiClient } from "./http";
import type { HttpResult } from "./client/responseParser";

export interface ShareResponse {
  id: string;
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
}

export interface ShareViewResponse {
  share: ShareResponse;
  resume: Record<string, unknown>;
  [key: string]: unknown;
}

export const shareApi = {
  create: (profileId: string): Promise<HttpResult<ShareResponse>> =>
    apiClient.post<ShareResponse>(`/api/v1/resumes/${encodeURIComponent(profileId)}/share`, {}),

  getOwn: (profileId: string): Promise<HttpResult<ShareResponse>> =>
    apiClient.get<ShareResponse>(`/api/v1/resumes/${encodeURIComponent(profileId)}/share`),

  revoke: (profileId: string): Promise<HttpResult<unknown>> =>
    apiClient.delete<unknown>(`/api/v1/resumes/${encodeURIComponent(profileId)}/share`),

  byToken: (token: string): Promise<HttpResult<ShareViewResponse>> =>
    apiClient.get<ShareViewResponse>(`/api/v1/shares/${encodeURIComponent(token)}`, false),
};

export async function copyShareLink(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}