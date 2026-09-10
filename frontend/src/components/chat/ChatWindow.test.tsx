import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import ChatWindow from "./ChatWindow";

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
  lng: "ru",
  resources: { ru: { translation: { chat: { empty_chat_title: "Начните общение" } } } },
});

const renderI18n = (ui: React.ReactElement) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe("ChatWindow", () => {
  it("shows empty when no conversation", () => {
    renderI18n(<ChatWindow conversation={null} messages={[]} onSend={vi.fn()} />);
    expect(screen.getByText(/Начните общение/)).toBeTruthy();
  });

  it("shows messages and input when conversation active", () => {
    const conv = { id: "c1", counterpart_name: "Иван" } as never;
    const msgs = [{ id: "m1", body: "Привет", sender_id: "other" }] as never[];
    renderI18n(<ChatWindow conversation={conv} messages={msgs} onSend={vi.fn()} />);
    expect(screen.getByText("Иван")).toBeTruthy();
    expect(screen.getByText("Привет")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Написать/)).toBeTruthy();
  });

  it("shows loading", () => {
    const conv = { id: "c1", counterpart_name: "Иван" } as never;
    renderI18n(<ChatWindow conversation={conv} messages={[]} messagesLoading onSend={vi.fn()} />);
    expect(document.querySelector(".skeleton")).toBeTruthy();
  });

  it("shows error with retry", () => {
    const conv = { id: "c1", counterpart_name: "Иван" } as never;
    const onRetry = vi.fn();
    renderI18n(<ChatWindow conversation={conv} messages={[]} messagesError="Не удалось загрузить сообщения" onRetryMessages={onRetry} onSend={vi.fn()} />);
    expect(screen.getByText(/Не удалось загрузить/)).toBeTruthy();
    screen.getByText(/Попробовать/).click();
    expect(onRetry).toHaveBeenCalled();
  });
});
