import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  onSend: (body: string) => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  initialValue?: string | null;
  onQuickDraftUsed?: () => void;
};

export default function MessageInput({ onSend, disabled, loading, error, onRetry, initialValue, onQuickDraftUsed }: Props): JSX.Element {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      onQuickDraftUsed?.();
      // focus and resize
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
      }, 0);
    }
  }, [initialValue, onQuickDraftUsed]);

  const trimmed = value.trim();
  const isEmpty = !trimmed;
  const canSend = !disabled && !loading && !isEmpty;

  const handleSend = useCallback(async () => {
    if (!canSend) {
      if (isEmpty) setLocalError(t("chat.empty_message_error", "Сообщение не может быть пустым") as string);
      return;
    }
    setLocalError(null);
    try {
      await onSend(trimmed);
      setValue("");
      // keep focus
      textareaRef.current?.focus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(msg);
    }
  }, [canSend, isEmpty, onSend, t, trimmed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
    // Shift+Enter → новая строка (default)
  };

  return (
    <div
      className="chat-input-wrap"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px var(--space-4, 16px)",
        paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
        background: "var(--color-surface, #fff)",
        borderTop: "1px solid var(--color-border, #E5E7EB)",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.input_placeholder", "Написать сообщение...") as string}
          aria-label={t("chat.input_placeholder", "Написать сообщение...") as string}
          rows={1}
          disabled={disabled || loading}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            resize: "none",
            padding: "10px 12px",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--color-border, #E5E7EB)",
            background: "var(--color-bg-secondary, #F9FAFB)",
            fontFamily: "inherit",
            fontSize: "16px", // prevent iOS zoom
            lineHeight: 1.4,
            outline: "none",
          }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          aria-label={t("chat.send", "Отправить") as string}
          className="btn-primary"
          style={{
            minWidth: 44,
            minHeight: 44,
            width: 44,
            height: 44,
            padding: 0,
            borderRadius: "var(--radius-full, 999px)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: !canSend ? 0.5 : 1,
          }}
        >
          {loading ? "◷" : "➤"}
        </button>
      </div>
      {(error || localError) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "var(--font-size-xs, 0.75rem)", color: "var(--color-danger, #EF4444)" }}>
          <span>{error || localError}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-ghost" style={{ fontSize: "var(--font-size-xs)", padding: "2px 6px", minHeight: 0 }}>
              {t("common.retry", "Повторить")}
            </button>
          )}
        </div>
      )}
      <div style={{ fontSize: "var(--font-size-xs, 0.6875rem)", color: "var(--color-text-muted, #6B7280)" }}>{t("chat.hint_enter", "Enter — отправить, Shift+Enter — новая строка")}</div>
    </div>
  );
}
