/**
 * Единый модуль валидации и нормализации данных форм (PATTERNS_AND_REUSE.md §2).
 * Переиспользуется между мастером PgBecomeTutor, редактором PgResumeEditor и профилем Profile.tsx.
 */

const KYRGYZ_PHONE_REGEX = /^\+996\d{9}$/;

export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+996" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("+") && cleaned.startsWith("996")) {
    return "+" + cleaned;
  }
  return cleaned;
}

export function isValidKyrgyzPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  return KYRGYZ_PHONE_REGEX.test(normalized);
}

export function isValidPriceRange(from?: number | string | null, to?: number | string | null): boolean {
  const numFrom = from !== undefined && from !== null && from !== "" ? Number(from) : null;
  const numTo = to !== undefined && to !== null && to !== "" ? Number(to) : null;

  if (numFrom !== null && (isNaN(numFrom) || numFrom < 0)) return false;
  if (numTo !== null && (isNaN(numTo) || numTo < 0)) return false;
  if (numFrom !== null && numTo !== null && numFrom > numTo) return false;
  return true;
}

export function isValidExperience(years?: number | string | null): boolean {
  if (years === undefined || years === null || years === "") return true;
  const num = Number(years);
  return !isNaN(num) && Number.isInteger(num) && num >= 0 && num <= 60;
}

export function normalizeTelegram(raw?: string | null): string {
  if (!raw) return "";
  let clean = raw.trim();
  clean = clean.replace(/^(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)/i, "");
  if (clean.startsWith("@")) {
    clean = clean.substring(1);
  }
  return clean;
}
