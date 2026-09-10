import { apiClient } from "./http";

export interface SeoSettings {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  canonicalBaseUrl: string;
  robotsTxt: string;
  ogImageUrl: string;
  ogLocale: string;
  structuredData: string;
  updatedAt: string;
}

export const seoApi = {
  getSettings: () => apiClient.get<SeoSettings>("/api/v1/seo/settings"),
  getAdminSettings: () => apiClient.get<SeoSettings>("/api/v1/admin/seo/settings"),
  updateSettings: (payload: Partial<SeoSettings>) => apiClient.put<SeoSettings>("/api/v1/admin/seo/settings", payload),
};
