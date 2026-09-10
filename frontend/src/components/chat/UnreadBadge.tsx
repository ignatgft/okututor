type Props = { count: number; className?: string };

export default function UnreadBadge({ count, className }: Props): JSX.Element | null {
  if (!count || count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      className={className ?? "chat-unread-badge"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: "var(--radius-full, 999px)",
        background: "var(--color-danger, #EF4444)",
        color: "#fff",
        fontSize: "var(--font-size-xs, 0.75rem)",
        fontWeight: 600,
        lineHeight: 1,
      }}
      aria-label={`${count} непрочитано`}
    >
      {display}
    </span>
  );
}
