// Русские названия статусов резюме (единый источник для дашбордов).
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

/**
 * Возвращает русское название статуса резюме.
 * Если у объекта есть готовый statusLabel от бэкенда — используем его,
 * иначе сопоставляем из RESUME_STATUS_LABELS.
 */
export function resumeStatusLabel(status: string | null | undefined, fallback = ""): string {
  if (status && RESUME_STATUS_LABELS[status]) return RESUME_STATUS_LABELS[status];
  return status || fallback;
}