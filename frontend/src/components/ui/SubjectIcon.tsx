import React from "react";

interface SubjectIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function SubjectIcon({ name, size = 24, className = "", style = {} }: SubjectIconProps): JSX.Element {
  const norm = name.toLowerCase().trim();

  // Common aliases and mapping
  switch (norm) {
    case "matematika":
    case "math":
    case "математика":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M18 4H6l6 8-6 8h12" />
        </svg>
      );

    case "angliyskiy":
    case "english":
    case "английский":
    case "английский язык":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M4 20 12 4l8 16" />
          <path d="M7.5 14h9" />
        </svg>
      );

    case "russkiy":
    case "russian":
    case "русский":
    case "русский язык":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M8 20V4h5a4 4 0 0 1 0 8H8" />
          <path d="M13 12l4 8" />
        </svg>
      );

    case "kyrgyzskiy":
    case "kyrgyz":
    case "кыргызский":
    case "кыргыз тили":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M7 4v16" />
          <path d="M17 4 9 12l8 8" />
        </svg>
      );

    case "fizika":
    case "physics":
    case "физика":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="12" r="1.8" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)" />
        </svg>
      );

    case "himiya":
    case "chemistry":
    case "химия":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M9 3h6" />
          <path d="M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-10V3" />
          <path d="M7.5 15h9" />
        </svg>
      );

    case "biologiya":
    case "biology":
    case "биология":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M7 3c0 5 10 5 10 9s-10 4-10 9" />
          <path d="M17 3c0 5-10 5-10 9s10 4 10 9" />
          <path d="M8.5 7.5h7M8.5 16.5h7" />
        </svg>
      );

    case "informatika":
    case "informatics":
    case "информатика":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );

    case "python":
    case "питон":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M8 7 4 12l4 5" />
          <path d="M16 7l4 5-4 5" />
          <path d="M13.5 4.5l-3 15" />
        </svg>
      );

    case "ort":
    case "орт":
    case "opt":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );

    default:
      // Generic book icon fallback
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
  }
}
