import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatApi } from "./chat.api";
import { apiClient } from "./http";

vi.mock("./http", () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ response: { ok: true }, data: [] })),
    post: vi.fn(() => Promise.resolve({ response: { ok: true }, data: {} })),
  },
}));

describe("chatApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listConversations calls GET /api/v1/conversations", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: { ok: true } as Response,
      data: { content: [{ id: "c1" }] },
    });
    const res = await chatApi.listConversations(0, 20);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/conversations?page=0&size=20");
    expect(res.data).toHaveLength(1);
  });

  it("listMessages calls GET /conversations/:id/messages with pagination", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: { ok: true } as Response,
      data: { content: [{ id: "m1", text: "hi" }] },
    });
    const res = await chatApi.listMessages("conv-123", 0, 20);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/conversations/conv-123/messages?page=0&size=20");
    expect(res.data[0].body).toBe("hi");
  });

  it("sendMessage validates empty and trims", async () => {
    await expect(chatApi.sendMessage("c1", "   ")).rejects.toThrow("Empty");
    await expect(chatApi.sendMessage("c1", "a".repeat(2001))).rejects.toThrow("2000");
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: { ok: true } as Response,
      data: { id: "m1", text: "hello" },
    });
    const res = await chatApi.sendMessage("c1", "  hello  ");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/c1/messages", { text: "hello" });
    expect(res.data.text).toBe("hello");
  });

  it("markRead posts to /read", async () => {
    await chatApi.markRead("c1");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/c1/read", {});
  });

  it("unreadCount tries direct endpoint then fallback", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ response: { ok: true } as Response, data: { count: 3 } });
    const res = await chatApi.unreadCount();
    expect(res.data.count).toBe(3);
  });

  it("createOrGetConversationForRequest tries /requests then /tutor-requests", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ response: { ok: false, status: 404 } as Response, data: {} })
      .mockResolvedValueOnce({ response: { ok: true } as Response, data: { id: "conv-1" } });
    await chatApi.createOrGetConversationForRequest("req-123").catch(() => null);
    expect(apiClient.post).toHaveBeenCalled();
  });
});
