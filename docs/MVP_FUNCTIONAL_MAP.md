# OkuTutor — фактическая и целевая карта функционала MVP

Дата базовой карты: 2026-11-27  
Репозиторий: `ignatgft/okututor`, ветка `master`  
Назначение: единый реестр страниц, компонентов и действий, необходимых для запуска работающего маркетплейса репетиторов.

> Важно: это **не утверждение, что всё уже реализовано**. Статус у каждого блока показывает качество доказательства. Первичная версия построена по проверенным маршрутам, ключевым компонентам и backend-контроллерам, а затем должна быть дополнена локальным аудитом всех импортов и тестов.

## 1. Статусы функциональности

| Статус | Значение |
|---|---|
| `CONFIRMED_IN_CODE` | Обнаружены конкретный код/endpoint/entity; сквозное выполнение ещё может требовать теста. |
| `ROUTE_ONLY` | Страница/маршрут объявлены, но весь функционал и API не трассированы. |
| `NEEDS_E2E` | Компоненты и API найдены, но сценарий не проверен целиком. |
| `DOC_ONLY` | Функция есть в старой карте, подтверждение в текущих файлах пока не найдено. |
| `LEGACY` | Маршрут/модуль помечен как устаревший, перенаправляемый или оставленный для совместимости. |
| `POST_MVP` | Полезно позже, но не блокирует первый marketplace launch. |
| `DECISION_REQUIRED` | Требуется продуктовый выбор. |
| `BLOCKER` | Без исправления нельзя безопасно/надёжно запускать. |

## 2. MVP: минимальная модель продукта

### Коммерческая модель

По переданной владельцем карте продукт запускается как Free MVP: нет тарифов, подписок, комиссий за уроки, платного продвижения и скрытых списаний; размещение анкеты бесплатное, продление заявлено бесплатным с шагом +30 дней. Это зафиксированное продуктовое требование, но не доказательство технической реализации. Перед публичным обещанием проверить endpoint продления, правила срока, повторные вызовы, статусы и тесты.

### Основной сценарий

1. Посетитель открывает главную.
2. Выбирает предмет/город или вводит поисковый запрос.
3. Получает каталог опубликованных анкет.
4. Открывает подробный профиль репетитора.
5. Отправляет заявку или другой предусмотренный контактный запрос.
6. Репетитор получает входящую заявку и может обработать её.
7. Пользователь может создать собственную анкету, сохранить изменения и отправить её на модерацию.
8. Администратор проверяет анкету и принимает решение.

### Роли

| Роль продукта | Задача | Текущее состояние |
|---|---|---|
| Посетитель | Смотреть каталог и публичные анкеты; отправлять разрешённый запрос | Public routes и `POST /api/v1/tutor-requests` обнаружены; E2E нужен |
| `USER` | Использовать платформу как ученик и при необходимости иметь анкету репетитора | Целевой вариант из продуктового описания; backend role normalization требует проверки |
| `ADMIN` | Модерировать анкеты, обрабатывать жалобы/пользователей | Admin routes обнаружены; server-side guards проверить по каждому endpoint |
| `SUPER_ADMIN` | Управлять системными полномочиями/настройками | Route/role упоминаются; точный перечень полномочий определить отдельно |
| `STUDENT`, `TUTOR` | Legacy compatibility | В текущем frontend ещё присутствуют; не считать целевыми ролями без проверки backend |

**MVP-решение:** стремиться к единому пользовательскому аккаунту `USER`, где `TutorProfile` — дополнительная анкета пользователя, а не отдельная роль/аккаунт. Админские роли остаются отдельными. Удаление legacy aliases — только после миграции и тестирования.

## 3. Карта публичных страниц

### 3.1 Главная `/`

- Реальный page: `frontend/src/pages/PgMain.tsx`.
- Imports/components: `Navbar`, `MarketplaceHero`, `SubjectGrid`, `PopTutor`, `HowItWorks`, `ForTutors`, `Footer`.
- MVP: оставить понятный value proposition, прямой поиск, категории, несколько актуальных анкет (при наличии), объяснение процесса и CTA «Найти репетитора» / «Разместить анкету».
- Действия: поиск должен переносить выбранные параметры в каталог; CTA размещения должен вести к `/become-tutor`.
- Проверить: реальные обработчики `MarketplaceHero`, доступность данных `SubjectGrid` и `PopTutor`, empty/error states, адаптивность, SEO title/description, canonical URL.
- Статус: `CONFIRMED_IN_CODE` для страницы и импортов; `NEEDS_E2E` для пользовательского поиска.

### 3.2 Каталог `/tutors`

- Реальный page: `frontend/src/pages/PgTutors.tsx`.
- Imports/components: `Navbar`, `TutorResumeCard`, `TutorFilters`, `useTutorSearch`, `Pagination`, primitives `Spinner`, `ErrorState`, `EmptyState`.
- Обнаруженные фильтры в UI state: subject, city, price min/max, format, tutor_type, level, text query; есть clear/reset logic и mobile filters state.
- MVP: поиск по опубликованным анкетам, фильтры предмет/город/формат/цена, пагинация, loading/empty/error, сохранение фильтров в URL при наличии.
- Не включать на запуск сложное ранжирование/персонализацию, если базовая выдача и фильтры ещё не доказаны.
- Проверить: debounce, параметры URL, серверную валидацию, сортировку, отсутствие скрытых/просроченных анкет, производительность и SEO.
- Статус: `CONFIRMED_IN_CODE` для page/import/state; `NEEDS_E2E` для API и фильтрации.

### 3.3 Публичный профиль `/tutor/:tutorId`

- Route в `frontend/src/app/router/AppRouter.tsx` ведёт на `features/tutors/components/TutorProfileMarketplace`.
- Backend public route: `GET /api/v1/tutors/{slug}`; также есть `GET /api/v1/tutors/resumes/{id}`.
- MVP-содержимое: имя, фото, город/формат, предметы, уровни, цена, образование/опыт, описание, кнопка отправки запроса/контакта.
- Обязательные состояния: загрузка, не найдено, скрыто/не опубликовано, удалённое/просроченное, server error.
- Не показывать персональные/служебные поля; публичный endpoint должен возвращать только public DTO.
- Проверить slug/ID routing: frontend route param называется `tutorId`, backend public lookup использует slug; убедиться, что URL строится согласованно.
- Статус: `NEEDS_E2E`.

### 3.4 Размещение анкеты `/become-tutor`

- Route и page: `frontend/src/pages/PgBecomeTutor.tsx`.
- Backend controller: `TutorProfileController` имеет create `POST /api/v1/tutors`, get/update/delete `/api/v1/tutors/me`, submit `/api/v1/tutors/me/submit`.
- MVP: пользователь авторизуется, заполняет минимально необходимые поля анкеты, видит validation errors, сохраняет draft (только если соответствующий endpoint реально есть), отправляет на модерацию.
- Поля для продуктового MVP: имя/отображаемое имя, контакты, город/онлайн, предметы, уровни учеников, формат, цена, описание, опыт/образование, фото (только если upload path готов). Расписание не делать обязательным без реальной потребности.
- Требования: автосохранение не заявлять, пока не подтверждены backend API и тесты; загрузка фото должна иметь проверку MIME/size, безопасное хранение и удаление orphan media.
- Статус: `ROUTE_ONLY` + `NEEDS_E2E`; точный wizard, количество шагов и все поля требуют локальной трассировки.

### 3.5 Авторизация и восстановление доступа

- Routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/oauth/callback`, `/oauth2/redirect`.
- Page imports из `AppRouter`: `Login`, `RegisterPage`, `PgForgotPassword`, `PgResetPassword`, `PgVerifyEmail`, `PgOAuthCallback`.
- MVP: email/password регистрация и вход; безопасное восстановление доступа; logout; email verification, если регистрация требует подтверждения; OAuth можно оставить опциональным, пока не подтверждены production credentials и redirect URIs.
- Проверить: rate limit, одинаковые ошибки при неверных credentials, refresh token lifecycle, revoked sessions, redirect allowlist, cookie flags/CSRF strategy, email delivery.
- Статус: routes `ROUTE_ONLY`; backend contract/E2E `NEEDS_E2E`.

### 3.6 Служебные публичные маршруты

- `/403` — forbidden.
- `*` — not found.
- `SeoNoindex`, `ErrorBoundary`, `PageLoader` используются в router.
- MVP: обязательны корректные 403/404/500 UI, noindex для private/error pages и понятная ссылка назад в каталог.
- Статус: `ROUTE_ONLY`.

## 4. Карта личного кабинета пользователя

Основная unified область в `AppRouter.tsx` находится под `ProtectedRoute` и `UserDashboardLayout`.

| Маршрут | Page | Минимальная функция MVP | Статус |
|---|---|---|---|
| `/dashboard` | `PgUserDashboard` | Сводка пользователя и быстрые ссылки к анкете/заявкам | `ROUTE_ONLY` |
| `/dashboard/resume` | `PgDashboardResume` | Показ текущего состояния анкеты и доступных действий | `ROUTE_ONLY` |
| `/dashboard/requests` | `PgMarketplaceChat` | Список исходящих/входящих обращений и контакт с репетитором | `NEEDS_E2E` |
| `/dashboard/requests/:requestId` | `PgMarketplaceChat` | Просмотр конкретного обращения/диалога | `NEEDS_E2E` |
| `/dashboard/profile` | `PgProfile` | Изменение данных пользователя | `ROUTE_ONLY` |
| `/dashboard/settings` | `PgSettings` | Пароль, сессии, настройки и опасные операции, если они реализованы | `ROUTE_ONLY` |

### Ключевой риск заявок

`TutorRequestController.GET /api/v1/tutor-requests` возвращает исходящие student requests, если они есть, иначе incoming tutor requests. Для dual-purpose USER это может скрывать входящие заявки. Проверить, какими API пользуется `PgMarketplaceChat`; разделить incoming/sent или согласовать объединённую модель.

### Минимальное поведение кабинета

- Нельзя показывать ложный статус, если API не ответил.
- Все приватные запросы должны выполняться с авторизацией.
- На уровне backend проверять ownership для каждого request/profile.
- После изменения статуса инвалидировать правильные TanStack Query keys или синхронизировать актуальный store.
- Ссылки, кнопки и tabs должны работать на мобильной ширине.

## 5. Карта админ-панели

`AdminRoutes.tsx` оборачивает раздел в `ProtectedRoute` для `ADMIN` и `SUPER_ADMIN`, `AdminLayout`.

| Маршрут | Page | Решение для MVP | Статус |
|---|---|---|---|
| `/admin` | `PgAdmin` | Минимальная сводка: очередь анкет, число активных анкет, заявки/пользователи | `ROUTE_ONLY` |
| `/admin/users` | `PgAdminUsers` | Поиск пользователя, блокировка/разблокировка, просмотр роли/status | `ROUTE_ONLY` |
| `/admin/tutors` | `PgAdminTutors` | Главная обязательная функция: очередь, просмотр, approve/reject, причина | `ROUTE_ONLY`; проверить API/permissions |
| `/admin/requests` | `PgAdminRequests` | Может быть полезно для abuse/support triage; минимальный просмотр | `POST_MVP` или `SHOULD_HAVE` |
| `/admin/reviews` | `PgAdminReviews` | Отложить, пока review workflow не подтверждён | `POST_MVP` |
| `/admin/reports` | `PgAdminReports` | Отложить, если нет критической антиспам-функции | `POST_MVP` |
| `/admin/metrics` | `PgAdminMetrics` | Минимум ошибок/пользователей/анкет; расширенные графики позже | `SHOULD_HAVE` |
| `/admin/support` | `PgAdminSupport` | Можно отложить при наличии внешнего контакта поддержки | `POST_MVP` |
| `/admin/support/tickets/:id` | `PgAdminSupportTicket` | То же | `POST_MVP` |
| `/admin/seo` | `PgAdminSeo` | Не блокирует запуск, если SEO metadata/sitemap управляются кодом | `POST_MVP` |
| `/admin/profile`, `/admin/settings` | `PgProfile`, `PgSettings` | Только реально нужные административные настройки | `DECISION_REQUIRED` |
| `/admin/courses` | Redirect to `/admin/tutors` | Legacy redirect | `LEGACY` |

Для модерации обязательны серверные permission checks, аудит действий модератора, reason при отказе, транзакционная смена статуса и невозможность публикации пользователем без модерации, если это утверждённое правило.

## 6. Дополнительные маршруты и legacy

### Поддержка

- `/support`, `/support/new`, `/support/tickets/:ticketId` — существуют в `AppRouter` под `ProtectedRoute`.
- Backend support domain присутствует в исходном поиске по репозиторию.
- Для Free MVP можно заменить полноценную систему тикетов простым каналом поддержки на старте, но только если владельцем продукта принят такой scope и пользователи имеют доступный способ сообщить о нарушении/проблеме.
- Статус: `ROUTE_ONLY`/`POST_MVP`, E2E требуется.

### Остальные legacy tutor routes

`TutorRoutes.tsx` также объявляет `/tutor/application`, `/tutor/stats`, `/tutor/students`, `/tutor/schedule`, `/tutor/lessons`, `/tutor/messages`, `/tutor/notifications`, `/tutor/profile`, `/tutor/settings`, `/tutor/progress`. Маршруты dashboard/requests и course creation частично перенаправляются. Для marketplace MVP эти старые страницы не должны автоматически попадать в основную навигацию; проверить deep links и зависимости, затем оставить redirect или отдельное решение.

### Conversations / chat

- `/conversations` и `/conversations/:conversationId` ведут на `PgConversations` под auth.
- `/dashboard/requests` ведёт на `PgMarketplaceChat`.
- Backend `chat` domain и `ChatConversation` обнаружены.
- Для запуска критичен надёжный контакт между учеником и репетитором, но не обязательно realtime websocket. Если request+contact/WhatsApp достаточно — полноценный чат можно отложить.
- Проверить, не дублируют ли `PgConversations` и `PgMarketplaceChat` один и тот же функционал.

### Legacy EdTech

- `AppRouter` содержит комментарии `COURSE SYSTEM REMOVED` и перенаправления course/lesson/booking/meeting/homework routes.
- `TutorRoutes` всё ещё объявляет student/tutor-oriented schedule, lessons, students, messages, notifications, profile, settings, progress.
- Эти разделы не должны быть частью основной навигации marketplace MVP, пока нет подтверждённой продуктовой потребности.
- Не удалять таблицы/миграции/доменные классы в этой задаче. Сначала построить dependency graph и план безопасной deprecation.

## 7. Подтверждённые UI-компоненты и layout blocks

### Главная

| Component | Назначение | Где подтверждён |
|---|---|---|
| `Navbar` | Верхняя навигация | Import в `PgMain`, `PgTutors` |
| `MarketplaceHero` | Главный поисковый блок | Import в `PgMain` |
| `SubjectGrid` | Выбор предмета/категории | Import в `PgMain` |
| `PopTutor` | Блок популярных анкет | Import в `PgMain` |
| `HowItWorks` | Объяснение процесса | Import в `PgMain` |
| `ForTutors` | CTA для репетиторов | Import в `PgMain` |
| `Footer` | Нижняя часть public home | Import в `PgMain` |

### Каталог

| Component/hook | Назначение | Где подтверждён |
|---|---|---|
| `TutorResumeCard` | Карточка результата | Import в `PgTutors` |
| `TutorFilters` | Фильтры | Import в `PgTutors` |
| `useTutorSearch` | Поиск/загрузка/filters state | Import в `PgTutors` |
| `Pagination` | Переход между страницами | Import в `PgTutors` |
| `Spinner` | Loading | Import из `components/ui/Primitives` |
| `ErrorState` | Ошибка | Import из `components/ui/Primitives` |
| `EmptyState` | Нет результатов | Import из `components/ui/Primitives` |

### Cross-cutting

Подтверждены imports/route wrappers: `ProtectedRoute`, `RoleRedirect`, `SupportTicketRedirect`, `RestoreContactIntent`, `ErrorBoundary`, `SeoNoindex`, `UserDashboardLayout`, `TutorLayout`, `AdminLayout`, `PageLoader`.

**Задача локального агента:** рекурсивно построить полный import tree каждой MVP-страницы и добавить точные дочерние компоненты, modals, dialogs, tabs, form fields и handlers. Не угадывать их по старой карте.

## 8. MVP-функции: приоритет

### MUST_HAVE — без этого нельзя запускать marketplace

1. Публичная главная с работающим поиском.
2. Каталог опубликованных анкет с базовыми фильтрами и пагинацией.
3. Публичная страница анкеты с корректными публичными данными и недоступными статусами.
4. Регистрация/вход, session lifecycle, защита приватных страниц.
5. Создание и обновление `TutorProfile` с серверной валидацией.
6. Отправка анкеты на модерацию.
7. Админская очередь модерации approve/reject с причиной.
8. Отправка заявки/контактного обращения и возможность обеим сторонам его обработать.
9. Базовые профиль/настройки пользователя.
10. Серверная authorization/ownership, rate limiting, safe file upload/storage.
11. Production config: реальные secrets, DB, email, storage, HTTPS, healthchecks, backups, error logging, rollback.
12. Тесты критического happy path и отказных сценариев.

### SHOULD_HAVE — настоятельно желательно до/сразу после запуска

- Email verification и password reset, если аккаунты используют email.
- Антиспам/репорты на анкеты, базовая блокировка пользователя.
- Минимальная admin metrics overview.
- SEO metadata, sitemap, robots, canonical URLs для публичных анкет.
- Двуязычный интерфейс, если обе локали полностью переведены и протестированы.
- Отдельные incoming/sent lists для заявок.

### POST_MVP

- Избранное, пока не подтверждена и не реализована полная цепочка.
- Публичные отзывы/рейтинги до появления безопасной verification strategy.
- Realtime chat, typing/online/presence, если обычной заявки/контакта достаточно для старта.
- Расширенная аналитика, отчёты, SEO-admin UI.
- Push notifications и сложные notification preferences.
- Сложные расписания, booking, payments, lessons, video rooms.
- Курсы, homework, learning progress, enrollment.

### LEGACY / REMOVE FROM PRIMARY FLOW

- Отдельные student/tutor dashboards, если принят единый USER dashboard.
- Course/lesson/booking/meeting routes, помеченные redirects или legacy.
- Старые aliases и дублирующиеся страницы чата — после проверки migration/deep links.

## 9. Обязательные сквозные критерии приёмки

### Visitor → search → profile → request

- Каталог не показывает DRAFT/PENDING/REJECTED/HIDDEN/EXPIRED анкеты.
- Фильтры и pagination совпадают с server response и сохраняются в URL при необходимости.
- Профиль открывается стабильным slug/ID URL.
- Заявка проходит серверную validation и rate limit.
- Повторная отправка не создаёт недопустимые дубли (idempotency/duplicate policy определена).
- Клиент видит подтверждение/ошибку и не теряет данные беспричинно.

### USER → profile → submit moderation

- Один user не может создать несколько активных TutorProfile, если модель 1:1.
- Нельзя отправить неполную анкету; backend повторно валидирует данные.
- Нельзя менять owner/userId через payload.
- Пользователь не может самостоятельно одобрить/опубликовать себя.
- Статус и доступные действия определяются сервером, а не только frontend.

### ADMIN → review

- Все admin endpoints защищены server-side.
- Нельзя одобрить/отклонить чужую сущность без проверки permission.
- Причина отказа обязательна, если этого требует продукт.
- Действие записывается в audit log.
- Публичная выдача обновляет статус без кеширования скрытой анкеты.

### Requests

- Входящие и исходящие обращения доступны независимо друг от друга.
- Проверяется ownership для чтения/изменения статуса.
- Пользователь не может менять чужую заявку.
- Проверяется сценарий пользователя, который одновременно ученик и репетитор.

## 10. Функции из старой карты, требующие перепроверки

| Функция | Что говорит старая карта | Что найдено при первичном осмотре | Решение |
|---|---|---|---|
| React 18 / Router 6 | Указаны как стек | `package.json`: React 19 / Router 7 | Обновить docs по package/lockfile |
| `TutorProfile` | Единый источник анкеты | Entity/controller обнаружены | Подтвердить DB constraints/1:1 в migrations |
| Favorites | UI, store и API | Нет `/favorites` в AppRouter; API/entity не подтверждены | `POST_MVP` или реализовать целиком |
| Renew/hide/restore | Описаны как endpoint | В просмотренном profile controller отсутствуют | Локально искать status handlers/jobs; не заявлять без подтверждения |
| Reviews via courses | `/courses/{id}/reviews` | Course routes помечены removed/redirect | Проверить review API; скорее POST_MVP |
| 10-шаговый wizard | Указан в карте | Page существует; точные шаги не трассированы | Проверить реальную форму и endpoint |
| Support tickets | Подробно описаны | Support routes/domain найдены | Определить, нужен ли полный ticketing для MVP |
| Realtime chat | WebSocket описан | Chat pages/domain есть | Проверить E2E; не делать обязательным, если simpler request flow работает |
| Full monitoring | Prometheus/Grafana/Loki описаны | Actuator/Prometheus dependency есть; root compose monitoring services не содержит | Проверить отдельный infra target |
| Resume expiration | 30 дней и renew | Не подтверждено этим controller inspection | Проверить job/state transitions/tests |

## 11. Как поддерживать эту карту

При каждом PR, меняющем route, endpoint, page, DTO, lifecycle или роль:
1. Обновить соответствующий раздел карты.
2. Добавить доказательство `path#symbol`.
3. Обновить `docs/API_CONTRACTS.md` при изменении API.
4. Обновить release gates и тесты, если меняется обязательный MVP-сценарий.
5. Не добавлять страницу в `CONFIRMED_IN_CODE` только из-за одного route declaration.
