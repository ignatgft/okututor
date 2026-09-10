import { apiClient } from "./http";

export interface DirectConversationResponse {
  id: string;
  requestId: string;
  type: string;
  participant: { id: string; name: string; avatarUrl: string };
  created: boolean;
  requestCreated: boolean;
}

export const conversationApi = {
  createOrGetDirect: (participantId: string) =>
    apiClient.post<DirectConversationResponse>("/api/v1/conversations/direct", { participantId }),
  createOrGetDirectByTutorId: (tutorId: string) =>
    apiClient.post<DirectConversationResponse>("/api/v1/conversations/direct", { participantId: tutorId }),
  list: (page = 0, size = 20) =>
    apiClient.get(`/api/v1/conversations?page=${page}&size=${size}`),
  get: (id: string) => apiClient.get(`/api/v1/conversations/${id}`),
};
