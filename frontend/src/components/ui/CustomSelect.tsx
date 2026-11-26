import React, { useState, useRef, useEffect, useId } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Выберите...",
  ariaLabel,
  id,
  className = "",
  style = {},
}: CustomSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const selectId = id || autoId;

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const nextIndex =
        e.key === "ArrowDown"
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length;
      if (options[nextIndex]) {
        onChange(options[nextIndex].value);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${className}`}
      style={{ position: "relative", width: "100%", ...style }}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        role="combobox"
        id={selectId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || displayLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        className="custom-select-trigger"
        style={{
          width: "100%",
          minHeight: 46,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "var(--color-surface, #242426)",
          color: selectedOption ? "var(--color-text, #fff)" : "var(--color-text-secondary, #a1a1aa)",
          border: `1px solid ${isOpen ? "var(--color-primary, #3b82f6)" : "var(--color-border, #3a3a3c)"}`,
          borderRadius: "var(--radius-lg, 12px)",
          fontSize: "var(--font-size-base, 14px)",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 0.15s ease",
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            color: "var(--color-text-muted, #8e8e93)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={selectId}
          className="custom-select-list"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: "var(--color-surface, #242426)",
            border: "1px solid var(--color-border, #3a3a3c)",
            borderRadius: "var(--radius-lg, 12px)",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
            maxHeight: 280,
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="custom-select-option"
                style={{
                  padding: "9px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  fontSize: "var(--font-size-base, 14px)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: isSelected ? "var(--color-primary, #3b82f6)" : "var(--color-text, #fff)",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? "var(--color-primary-light, rgba(59,130,246,0.15))" : "transparent",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover, #2c2c2e)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
