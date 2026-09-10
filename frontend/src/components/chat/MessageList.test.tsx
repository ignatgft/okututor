import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import MessageList from "./MessageList";
import type { ChatMessage } from "../../api/chat.api";
import { vi } from "vitest";

vi.mock("../../store/authStore", async () => {
  const actual = await vi.importActual("../../store/authStore") as unknown as Record<string, unknown>;
  return {
    ...actual,
    default: () => ({ user: { id: "user-1" } }),
  };
});

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: {} } } });

const renderI18n = (ui: React.ReactElement) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe("MessageList", () => {
  it("renders own and other bubbles", () => {
    const msgs: ChatMessage[] = [
      { id: "m1", body: "Hello", sender_id: "user-2", created_at: new Date().toISOString() } as ChatMessage,
      { id: "m2", body: "Hi", sender_id: "user-1", created_at: new Date().toISOString(), own: true } as ChatMessage,
    ];
    renderI18n(<MessageList messages={msgs} />);
    expect(screen.getByText("Hello")).toBeTruthy();
    expect(screen.getByText("Hi")).toBeTruthy();
  });

  it("handles empty", () => {
    const { container } = renderI18n(<MessageList messages={[]} />);
    // bottom ref exists, but no bubbles
    expect(container.querySelector(".chat-message-list")).toBeTruthy();
  });
});
