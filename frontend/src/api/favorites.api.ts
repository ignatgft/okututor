import { apiClient } from "./http";

export const favoritesApi = {
  list: () => apiClient.get<Record<string, unknown>[]>("/api/v1/favorites"),
  ids: () => apiClient.get<string[]>("/api/v1/favorites/ids"),
  add: (profileId: string) => apiClient.post(`/api/v1/favorites/${profileId}`, {}),
  remove: (profileId: string) => apiClient.delete(`/api/v1/favorites/${profileId}`),
};
