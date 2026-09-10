import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import ConversationList from "./ConversationList";

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
  lng: "ru",
  resources: { ru: { translation: { chat: { conversations: "Обращения", empty_requests_title: "У вас пока нет обращений" } } } },
  interpolation: { escapeValue: false },
});

const renderI18n = (ui: React.ReactElement) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe("ConversationList", () => {
  it("shows skeleton when loading", () => {
    const { container } = renderI18n(<ConversationList conversations={[]} activeId={null} onSelect={vi.fn()} loading />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });

  it("shows empty state when no conversations", () => {
    renderI18n(<ConversationList conversations={[]} activeId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/У вас пока нет обращений/)).toBeTruthy();
  });

  it("renders conversations with unread badge", () => {
    const convs = [
      { id: "c1", counterpart_name: "Иван Петров", last_message: "Привет!", unread_count: 2, updated_at: new Date().toISOString() },
      { id: "c2", counterpart_name: "Мария", last_message: "Ок", unread_count: 0, updated_at: new Date().toISOString() },
    ] as never[];
    renderI18n(<ConversationList conversations={convs} activeId="c1" onSelect={vi.fn()} />);
    expect(screen.getByText("Иван Петров")).toBeTruthy();
    expect(screen.getByText("Мария")).toBeTruthy();
    // unread badge 2 should appear
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("shows error with retry", () => {
    const onRetry = vi.fn();
    renderI18n(<ConversationList conversations={[]} activeId={null} onSelect={vi.fn()} error="Ошибка сети" onRetry={onRetry} />);
    expect(screen.getByText(/Ошибка сети/)).toBeTruthy();
    const btn = screen.getByText(/Попробовать/);
    btn.click();
    expect(onRetry).toHaveBeenCalled();
  });
});
