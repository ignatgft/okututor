import "../../styles/ui.css";
import type { ReactNode } from "react";
import { normalizeMediaUrl } from "../../utils/mediaUrl";

function initialsOf(name = ""): string {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export interface AvatarProps {
  name?: string;
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  fallbackIcon?: ReactNode;
}

export function Avatar({ name, src, alt, size = 40, className = "", fallbackIcon }: AvatarProps): JSX.Element {
  const normalizedSrc = normalizeMediaUrl(src) ?? src;
  if (normalizedSrc) {
    return (
      <img
        className={`avatar ${className}`}
        src={normalizedSrc}
        alt={alt || name || ""}
        width={size}
        height={size}
        loading="lazy"
        onError={(e) => {
          // fallback to initials if R2 direct 401 etc.
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  const initials = initialsOf(name ?? "");
  return (
    <span
      className={`avatar avatar-fallback ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      role="img"
      aria-label={alt || name || ""}
    >
      {initials || fallbackIcon || "?"}
    </span>
  );
}

export default Avatar;
