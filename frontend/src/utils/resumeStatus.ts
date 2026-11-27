// Названия статусов резюме (единый источник для дашбордов).
// Русский map оставлен как fallback; при переданном t используются ключи resume.status.*.
export const RESUME_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_MODERATION: "На модерации",
  PENDING: "На модерации",
  PUBLISHED: "Опубликовано",
  ACTIVE: "Активно",
  REJECTED: "Отклонено",
  SUSPENDED: "Приостановлено",
  EXPIRED: "Истекло",
  HIDDEN: "Скрыто",
  ARCHIVED: "В архиве",
  DELETED: "Удалено",
};

type TFn = (key: string, fallback: string) => string;

/**
 * Возвращает локализованное название статуса резюме.
 * Если у объекта есть готовый statusLabel от бэкенда — используем его,
 * иначе сопоставляем из RESUME_STATUS_LABELS (или ключа resume.status.* при наличии t).
 */
export function resumeStatusLabel(
  status: string | null | undefined,
  fallback = "",
  t?: TFn,
): string {
  if (status && t) {
    const fb = RESUME_STATUS_LABELS[status] ?? status ?? fallback;
    const v = t(`resume.status.${status}`, fb);
    if (typeof v === "string" && v) return v;
  }
  if (status && RESUME_STATUS_LABELS[status]) return RESUME_STATUS_LABELS[status];
  return status || fallback;
}