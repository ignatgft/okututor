# Admin Dashboard — Okututor

`/admin` теперь показывает **полезную** аналитику, а не только 4 карточки.

## Что показывает (GET /api/v1/admin/stats + /api/v1/admin/metrics/overview)

| Карточка | Ключи backend | Что считаем |
|----------|---------------|-------------|
| Пользователи | `total_users` | `userRepository.count()` |
| Резюме | `total_tutor_profiles` | `tutorProfileRepository.count()` + подтекст `pending_tutor_profiles` / `published/active` |
| Заявки | `total_tutor_requests` | `tutorRequestRepository.count()` |
| Отзывы | `total_reviews` | `reviewRepository.count()` + `hidden/archived` |
| Истекают (7д) | `expiring_soon_tutor_profiles` | `expiresAt` in 7d |
| Истекло | `expired_tutor_profiles` | `status=EXPIRED` |

**Фронт** `frontend/src/pages/PgAdmin.tsx:19` мержит оба ответа `Promise.all([stats, overview])`, fallback `Number(... ?? 0)`.

## Быстрые действия

- Управление пользователями, Заявки репетиторов, Заявки (tutor-requests), Поддержка, Метрики, Телеграм, SEO, Сообщения (NEW)

## Фильтр /admin/tutors

Было: дубль `PENDING` + `PENDING_MODERATION` (`Ожидает ответа` vs `На рассмотрении`), ветка `useNewApi` → показывал все `PUBLISHED`.

Стало: единый `PENDING_MODERATION` → `Ожидает ответа` (`frontend/src/pages/PgAdminTutors.tsx:342`), `load()` всегда `adminApi.tutorProfiles(status,q)` (унифицировано, без legacy ветки).

## Поддержка

`support.status/category/priority` — были объекты, `t("support.status")` возвращал объект → `KEY RETURNED OBJECT`. Добавлены плоские `_title` ключи в `ru/en/kg` и `AdminSupportTable/Filters/Actions` переведены на `t("support.status_title")` etc.

