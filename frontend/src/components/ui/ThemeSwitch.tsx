import React from "react";
import { useTheme } from "../../hooks/useTheme";

interface ThemeSwitchProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeSwitch({ showLabel = false, className = "" }: ThemeSwitchProps): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
        title={isDark ? "Светлая тема" : "Тёмная тема"}
        className={`theme-switch-btn ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minHeight: 36,
          padding: "6px 12px",
          borderRadius: "var(--radius-md, 16px)",
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
        <span>{isDark ? "Светлая тема" : "Тёмная тема"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className={`ghost-icon ${className}`}
      id="themeToggle"
    >
      {isDark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
