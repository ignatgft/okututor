/** Tutor types for marketplace display — §9 */
export const TUTOR_TYPES = [
  { value: "TEACHER", labelKey: "tutor_type.teacher", labelRu: "Преподаватель" },
  { value: "PROFESSIONAL_TUTOR", labelKey: "tutor_type.professional", labelRu: "Профессиональный репетитор" },
  { value: "STUDENT_TUTOR", labelKey: "tutor_type.student", labelRu: "Студент-репетитор" },
] as const;

export type TutorTypeValue = (typeof TUTOR_TYPES)[number]["value"];

/** Human label for tutor type — always Russian marketplace label (§9) */
export function tutorTypeLabel(value: unknown, t?: (k: string, fallback: string) => string): string {
  if (!value || typeof value !== "string") return "";
  const normalized = value.toUpperCase().trim();
  // map legacy/backend variants → canonical
  const map: Record<string, string> = {
    TEACHER: "TEACHER",
    ПРЕПОДАВАТЕЛЬ: "TEACHER",
    PROFESSIONAL: "PROFESSIONAL_TUTOR",
    PROFESSIONAL_TUTOR: "PROFESSIONAL_TUTOR",
    PROFESSIONAL_REPETITOR: "PROFESSIONAL_TUTOR",
    STUDENT: "STUDENT_TUTOR",
    STUDENT_TUTOR: "STUDENT_TUTOR",
    "СТУДЕНТ-РЕПЕТИТОР": "STUDENT_TUTOR",
    "СТУДЕНТ": "STUDENT_TUTOR",
  };
  const canonical = map[normalized] ?? normalized;
  const entry = TUTOR_TYPES.find((x) => x.value === canonical);
  if (!entry) return String(value);
  if (t) return t(entry.labelKey, entry.labelRu);
  return entry.labelRu;
}

export const isStudentTutor = (value: unknown): boolean => {
  if (!value || typeof value !== "string") return false;
  return value.toUpperCase().includes("STUDENT");
};
