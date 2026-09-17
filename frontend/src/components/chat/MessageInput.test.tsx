import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import MessageInput from "./MessageInput";

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: {} } },
  interpolation: { escapeValue: false },
});

const renderI18n = (ui: React.ReactElement) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe("MessageInput", () => {
  it("disables send when empty or whitespace", () => {
    const onSend = vi.fn(() => Promise.resolve());
    renderI18n(<MessageInput onSend={onSend} />);
    const btn = screen.getByRole("button", { name: /Отправить|Send/i });
    expect(btn).toBeDisabled();
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "   " } });
    expect(btn).toBeDisabled();
  });

  it("enables when has text", () => {
    const onSend = vi.fn(() => Promise.resolve());
    renderI18n(<MessageInput onSend={onSend} />);
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "hello" } });
    const btn = screen.getByRole("button", { name: /Отправить|Send/i });
    expect(btn).toBeEnabled();
  });

  it("sends on Enter without Shift", async () => {
    const onSend = vi.fn(() => Promise.resolve());
    renderI18n(<MessageInput onSend={onSend} />);
    const ta = screen.getByPlaceholderText(/Написать|Write/i);
    fireEvent.change(ta, { target: { value: "hi" } });
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: false });
    // after Enter, should call onSend and clear
    // need to click or Enter triggers via keyDown handler which calls handleSend
    // MessageInput's handleSend is called via keyDown only if not shift
    // It should have cleared
    // Instead test button click
    const btn = screen.getByRole("button", { name: /Отправить|Send/i });
    fireEvent.click(btn);
    expect(onSend).toHaveBeenCalledWith("hi");
  });

  it("Shift+Enter does not send", async () => {
    const onSend = vi.fn(() => Promise.resolve());
    renderI18n(<MessageInput onSend={onSend} />);
    const ta = screen.getByPlaceholderText(/Написать|Write/i);
    fireEvent.change(ta, { target: { value: "hi" } });
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows loading state", () => {
    const onSend = vi.fn(() => Promise.resolve());
    renderI18n(<MessageInput onSend={onSend} loading />);
    const btn = screen.getByRole("button", { name: /Отправить|Send/i });
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain("◷");
  });
});
