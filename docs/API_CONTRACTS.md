# API_CONTRACTS — Полная карта проверенных marketplace API

Дата: 2026-11-27  
Статус: Актуализировано по результатам полного мультиагентного аудита backend-контроллеров и frontend API-клиентов.

---

## 1. Tutor profile (Анкета репетитора)

**Контроллер:** `backend/src/main/java/com/okututor/backend/tutor/TutorProfileController.java`  
**Фронтенд-клиенты:** `frontend/src/api/marketplace/tutorApi.ts`, `features/tutors/api/tutorApi.ts`

| Метод | Путь | Доступ | Назначение и поведение | Статус |
|---|---|---|---|---|
| `GET` | `/api/v1/tutors` | Public | Листинг и полнотекстовый поиск. Поддерживает параметры: `q`, `subject`, `city`, `level`, `tutor_type`, `online`, `offline`, `minPrice`, `maxPrice`, `sort`. Кэшируется, rate limit 100/мин. | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/resumes` | Public | Алиас публичного листинга | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/slice` | Public | Slice-пагинация для бесконечного скролла без тяжелого `COUNT(*)` | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/cursor` | Public | Кисет-пагинация (по `publishedAt DESC, id DESC`) | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/popular` | Public | Популярные анкеты для главной страницы (`views` -> `rating` -> `publishedAt`). In-memory кэш 1 мин. | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/{slug}` | Public | Публичная анкета по slug. При статусе `PUBLISHED` инкрементирует просмотры. Проверяет `expiresAt > now`, `!blocked`. | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/resumes/{id}` | Public | Профиль по UUID с фолбэком на slug | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutors` | `USER` | Создание черновика анкеты (`DRAFT`) | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/me` | `USER` | Получение собственной анкеты текущего пользователя | `CONFIRMED_IN_CODE` |
| `PUT` | `/api/v1/tutors/me` | `USER` | Обновление полей анкеты | `CONFIRMED_IN_CODE` |
| `DELETE` | `/api/v1/tutors/me` | `USER` | Удаление собственной анкеты | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutors/me/submit` | `USER` | Отправка анкеты на модерацию (`DRAFT` / `REJECTED` -> `PENDING_MODERATION`) | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutors/me/renew` | `USER` | Продление анкеты на 30 дней. Разрешено в окне 7 дней до истечения. Формула: `max(now, expiresAt) + 30d`. | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutors/me/hide` | `USER` | Скрытие анкеты из поиска (`PUBLISHED` -> `HIDDEN`) | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutors/me/restore` | `USER` | Восстановление скрытой анкеты (`HIDDEN` -> `PUBLISHED`). Если истекла — автопродление. | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutors/me/photo` | `USER` | Загрузка и оптимизация фото анкеты (WebP, max 1200x1200). Сбрасывает публичные кэши. | `CONFIRMED_IN_CODE` |
| `DELETE` | `/api/v1/tutors/me/photo` | `USER` | Удаление фото анкеты | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/me/status` | `USER` | Гарантированный статус анкеты для UI-роутинга | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/me/preview` | `USER` | Владельческий предпросмотр анкеты в любом статусе модерации | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/me/stats` | `USER` | Количество просмотров и добавлений в избранное | `CONFIRMED_IN_CODE` |

---

## 2. Tutor requests (Заявки и лиды)

**Контроллер:** `backend/src/main/java/com/okututor/backend/request/TutorRequestController.java`  
**Фронтенд-клиент:** `frontend/src/api/marketplace/tutorRequestsMarketplace.api.ts`

| Метод | Путь | Доступ | Назначение и поведение | Статус |
|---|---|---|---|---|
| `POST` | `/api/v1/tutor-requests` | Anonymous / Auth | Создание заявки репетитору. Rate-limit (5/час на IP, 10/час на аккаунт). Защита от дублей через partial index. | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutor-requests/me` | Auth | Исходящие заявки пользователя (как ученика) | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutors/me/requests` | Auth | Входящие заявки пользователя (как репетитора) | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutor-profiles/me/requests` | Auth | Алиас входящих заявок | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/tutor-requests` | Auth | Generic список заявок. **Дефект:** отдает входящие заявки, только если исходящих 0. | `CONFIRMED_IN_CODE` (требует фикса) |
| `POST` | `/api/v1/tutor-requests/{id}/viewed` | Репетитор | Перевод заявки `NEW` -> `VIEWED` | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutor-requests/{id}/status` | Репетитор / Ученик | Изменение статуса (`VIEWED`, `CONTACTED`, `CLOSED`). Ученик имеет право переводить только в `CLOSED`. | `CONFIRMED_IN_CODE` |
| `PATCH` | `/api/v1/tutor-requests/{id}` | Репетитор / Ученик | Алиас изменения статуса | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/admin/tutor-requests` | `ADMIN` | Административный реестр всех заявок | `CONFIRMED_IN_CODE` |

---

## 3. Favorites (Избранное)

**Контроллер:** `backend/src/main/java/com/okututor/backend/favorite/FavoriteController.java`  
**Фронтенд-клиент:** `frontend/src/api/favorites.api.ts`  
**Хук:** `frontend/src/hooks/useFavorites.ts`

| Метод | Путь | Доступ | Назначение | Статус |
|---|---|---|---|---|
| `GET` | `/api/v1/favorites` | Auth | Список избранных анкет текущего пользователя с пагинацией | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/favorites/{tutorProfileId}` | Auth | Добавление анкеты в избранное (идемпотентно, `ON CONFLICT DO NOTHING`) | `CONFIRMED_IN_CODE` |
| `DELETE` | `/api/v1/favorites/{tutorProfileId}` | Auth | Удаление анкеты из избранного | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/favorites/check/{tutorProfileId}` | Auth | Проверка, находится ли анкета в избранном (boolean) | `CONFIRMED_IN_CODE` |

---

## 4. Chat & Messaging (Чат в реальном времени)

**Контроллеры:** `ChatController.java`, `ChatMessageController.java`  
**Фронтенд-клиенты:** `frontend/src/api/chat.api.ts`, `frontend/src/api/messages.api.ts`

| Метод | Путь | Доступ | Назначение | Статус |
|---|---|---|---|---|
| `GET` | `/api/v1/chat/conversations` | Auth | Список активных диалогов пользователя с последним сообщением и счётчиком непрочитанных | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/chat/conversations/direct/{tutorUserId}` | Auth | Получить или создать прямой диалог с репетитором | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/tutor-requests/{id}/conversation` | Auth | Создать или связать диалог чата с заявкой | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/chat/conversations/{id}/messages` | Участник | История сообщений диалога с пагинацией | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/chat/conversations/{id}/messages` | Участник | Отправка текстового сообщения | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/chat/conversations/{id}/read` | Участник | Пометка сообщений диалога как прочитанных | `CONFIRMED_IN_CODE` |

---

## 5. Admin & Moderation (Панель администратора)

**Контроллеры:** `AdminController.java`, `AdminTutorController.java`, `AdminUsersController.java`  
**Фронтенд-клиент:** `frontend/src/api/admin.api.ts`

| Метод | Путь | Доступ | Назначение | Статус |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/tutors/pending` | `ADMIN` | Очередь анкет, ожидающих модерации (`PENDING_MODERATION`) | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/admin/tutors/{id}/approve` | `ADMIN` | Одобрение анкеты (`PENDING_MODERATION` -> `PUBLISHED`, ставит `expiresAt = now + 30d`) | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/admin/tutors/{id}/reject` | `ADMIN` | Отклонение анкеты с обязательным указанием причины | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/admin/tutors/{id}/suspend` | `ADMIN` | Приостановка анкеты репетитора | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/admin/tutors/{id}/restore` | `ADMIN` | Восстановление приостановленной анкеты | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/admin/users` | `ADMIN` | Список зарегистрированных пользователей с фильтрами | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/admin/users/{id}/block` | `ADMIN` | Блокировка пользователя с моментальным отзывом JWT сессий | `CONFIRMED_IN_CODE` |
| `POST` | `/api/v1/admin/users/{id}/unblock` | `ADMIN` | Разблокировка пользователя | `CONFIRMED_IN_CODE` |
| `GET` | `/api/v1/admin/metrics` | `ADMIN` | Агрегированная сводка (число пользователей, анкет, заявок, конверсий) | `CONFIRMED_IN_CODE` |

---

## 6. Устаревшие эндпоинты (Legacy LMS — Исключены из MVP)

| Эндпоинт | Исходный модуль | Текущее состояние | Решение для MVP |
|---|---|---|---|
| `/api/v1/courses/**` | `CourseController` | Удалены JPA-сущности `Course` и `Booking`. Перехватывается `LegacyApiGuard` (`410 GONE`). | Не использовать в MVP |
| `/api/v1/courses/{id}/reviews` | `ReviewController` | Привязан к легаси курсам. Таблица `tutor_reviews` в БД отсутствует. | Отключить отображение в UI, рейтинг брать из полей `tutor_profiles` |
| `/api/v1/livekit/**` | `MeetingController` | Видеокомнаты LiveKit не требуются для каталога. | Отложено на Post-MVP |
| `/api/v1/schedules/**` | `ScheduleController` | Календари и бронирование слотов. | Отложено на Post-MVP |
