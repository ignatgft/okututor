import { apiClient } from "./http";

export interface LegalVersion {
  id: string;
  documentId: string;
  version: string;
  title: string;
  content: string;
  language: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  publishedAt?: string | null;
  effectiveAt?: string | null;
  requiresReconsent: boolean;
}

export interface CookieConsentConfig {
  documents: { type: string; title: string; version: string; requiresReconsent: boolean; effectiveAt: string }[];
  cookieCategories: { code: string; name: string; description: string; isRequired: boolean }[];
  providers: { id: string; name: string; provider: string; category: string; purpose: string; duration: string }[];
}

export const legalApi = {
  // public
  getPublished: (type: string, lang = "ru") =>
    apiClient.get(`/api/v1/public/legal/${encodeURIComponent(type)}?lang=${encodeURIComponent(lang)}`),
  getTerms: (lang = "ru") => apiClient.get(`/api/v1/public/legal/terms?lang=${lang}`),
  getPrivacy: (lang = "ru") => apiClient.get(`/api/v1/public/legal/privacy?lang=${lang}`),
  getCookiePolicy: (lang = "ru") => apiClient.get(`/api/v1/public/legal/cookies?lang=${lang}`),
  getPersonalData: (lang = "ru") => apiClient.get(`/api/v1/public/legal/personal-data?lang=${lang}`),
  getConsentConfig: () => apiClient.get<CookieConsentConfig>("/api/v1/public/consent/config"),

  // admin
  listDocuments: () => apiClient.get("/api/v1/admin/legal/documents"),
  createDocument: (payload: { type: string; title: string; description?: string }) =>
    apiClient.post("/api/v1/admin/legal/documents", payload),
  listVersions: (docId: string) => apiClient.get(`/api/v1/admin/legal/documents/${docId}/versions`),
  createVersion: (docId: string, payload: Record<string, unknown>) =>
    apiClient.post(`/api/v1/admin/legal/documents/${docId}/versions`, payload),
  updateDraft: (versionId: string, payload: Record<string, unknown>) =>
    apiClient.put(`/api/v1/admin/legal/versions/${versionId}`, payload),
  publish: (versionId: string, effectiveAt?: string) =>
    apiClient.post(`/api/v1/admin/legal/versions/${versionId}/publish`, effectiveAt ? { effectiveAt } : {}),
  archive: (versionId: string) => apiClient.post(`/api/v1/admin/legal/versions/${versionId}/archive`, {}),
  getVersion: (versionId: string) => apiClient.get(`/api/v1/admin/legal/versions/${versionId}`),

  // cookies admin
  listCategories: () => apiClient.get("/api/v1/admin/legal/cookies/categories"),
  listProviders: () => apiClient.get("/api/v1/admin/legal/cookies/providers"),
  createProvider: (payload: Record<string, unknown>) =>
    apiClient.post("/api/v1/admin/legal/cookies/providers", payload),
  updateProvider: (id: string, payload: Record<string, unknown>) =>
    apiClient.put(`/api/v1/admin/legal/cookies/providers/${id}`, payload),

  // consents admin
  listConsents: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiClient.get(`/api/v1/admin/legal/consents${q ? `?${q}` : ""}`);
  },
  health: () => apiClient.get("/api/v1/admin/legal/documents/health"),
};

export const tgApi = {
  list: () => apiClient.get("/api/v1/admin/telegram/recipients"),
  create: (payload: { chatId: string; username?: string; displayName?: string; notifyCritical?: boolean; notifyWarning?: boolean }) =>
    apiClient.post("/api/v1/admin/telegram/recipients", payload),
  update: (id: string, payload: Record<string, unknown>) =>
    apiClient.put(`/api/v1/admin/telegram/recipients/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/api/v1/admin/telegram/recipients/${id}`),
  test: (id: string) => apiClient.post(`/api/v1/admin/telegram/recipients/${id}/test`, {}),
  health: () => apiClient.get("/api/v1/admin/telegram/health"),
};

export const consentApi = {
  accept: (payload: { consentType: string; documentType?: string; version?: string }) =>
    apiClient.post("/api/v1/consents/accept", payload),
  myConsents: () => apiClient.get("/api/v1/consents/me"),
  requiring: () => apiClient.get("/api/v1/consents/requiring"),
  history: () => apiClient.get("/api/v1/consents/history"),
};
