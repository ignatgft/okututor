/** Slug helpers for marketplace SEO URLs: /repetitor/matematika/{slug} */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function tutorSlug(tutor: Record<string, unknown>): string {
  const rawSlug = tutor["slug"] ?? tutor["username"] ?? tutor["id"];
  if (typeof rawSlug === "string" && rawSlug.trim()) return slugify(rawSlug) || String(tutor["id"] ?? "");
  if (typeof rawSlug === "number") return String(rawSlug);
  return String(tutor["id"] ?? "");
}

export function subjectSlug(subject: string): string {
  const map: Record<string, string> = {
    Mathematics: "matematika",
    Математика: "matematika",
    English: "angliyskiy",
    Английский: "angliyskiy",
    Russian: "russkiy",
    Русский: "russkiy",
    Kyrgyz: "kyrgyzskiy",
    Кыргызский: "kyrgyzskiy",
    Physics: "fizika",
    Физика: "fizika",
    Chemistry: "himiya",
    Химия: "himiya",
    Biology: "biologiya",
    Биология: "biologiya",
    Informatics: "informatika",
    Информатика: "informatika",
    IT: "informatika",
    Python: "python",
    "Preparation for ORT": "ort",
    ОРТ: "ort",
  };
  const key = subject.trim();
  return map[key] ?? slugify(key);
}
