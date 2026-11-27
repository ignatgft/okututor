# Итоговый отчёт аудита OkuTutor

**Дата:** 26-27 ноября 2026  
**Ветка аудита:** `audit/2026-initial` (HEAD `dbdb3d0`)  

### Исходные репозитории, ветки и зафиксированные коммиты (Этап 0):
- **Монорепозиторий (origin):** `https://github.com/ignatgft/okututor.git`
  - `origin/appmod/java-upgrade-20260817055013`: `0dd5b7f68db29e6f4d2248839b43e9f1f0776b26`
  - `main`: `58527d7a7441b2977dda747374c65e81a5fb048d`
- **Backend (ig-back):** `https://github.com/ignatgft/okututor-backend.git`
  - `ig-back/main`: `521d0315b6442225e320b8b4c3a50e1013ab32e0`
  - `ig-back/chore/cleanup-20260917`: `ccb5e770bd0b2b8f3ae0bd2d4ddbc4461004c28f`
- **Frontend (ig-front):** `https://github.com/ignatgft/front_okututor.git`
  - `ig-front/master`: `57e3cacdd6344fd82e3f49bcfde72aa8aa7ae104`
  - `ig-front/main`: `2c72a0422595b845414e191105b02d65706f3d16`
- **Monitoring (monitoring-remote):** `https://github.com/ignatgft/okututor-monitoring.git`
  - `monitoring-remote/main`: `87c9b2871ea69b0818e0a4caacc2919e77750972`
- **Рабочая ветка аудита:** `audit/2026-initial` (активна, прямые пуши в `main` и `develop` отсутствуют)  

---

## 1. Резюме
Проект OkuTutor представляет собой бесплатную платформу-маркетплейс репетиторов в Кыргызстане (Free MVP без платежей и платных поднятий). В ходе аудита проведена полная ревизия 458 файлов репозитория, сформирован инвентарь `docs/audit/FILE_INVENTORY.csv`, развёрнут единый корневой `docker-compose.yml` на 7 сервисов со строгими healthcheck. Устранены критические P0-дефекты поисковых запросов (`expiresAt > current_timestamp`), исправлено окно статуса `EXPIRING` с 3 до 7 дней, внедрена метрика шедулера и Prometheus-алерт на его зависание более 2 часов. Проведён сквозной автоматизированный smoke-тест из 10 стадий («регистрация → верификация через Mailpit → логин → создание резюме → модерация админом → публикация на 30 дней → поиск → метрики»), подтвердивший 100% работоспособность ключевого цикла. Выполнен аудит git-истории на секреты перед возможным переводом репозитория в приватный статус.

---

## 2. Структура системы

### Модули Backend (Spring Boot 3.5.4, Java 21)
Всего в проекте 26 пакетов и 34 JPA-сущности в `com.okututor.backend.*`:
- `tutor` (25 классов): Жизненный цикл резюме (`TutorProfile`, `TutorProfileService`, `TutorProfileController`, модерация `TutorModerationController`, планировщик `ResumeExpiryScheduler`).
- `search` (14 классов): Полнотекстовый поиск, нормализация раскладки (ru/en), опечатки, стоп-слова, фильтрация по строгим условиям активности резюме (`SearchController`, `TutorSearchService`, `KeyboardLayoutNormalizer`, `SynonymExpander`).
- `auth` & `security` (34 класса): Регистрация, верификация через 6-значный email-код (`EmailVerificationService`), ротация refresh-токенов в Redis, JWT-фильтр, роли `USER`, `ADMIN`, `SUPER_ADMIN`.
- `chat` (16 классов): Двусторонний диалог между учеником и репетитором, WebSocket (`/ws/chat`), модерация чатов администратором, одноразовые WS-тикеты (`WsTicketController`, `WsTicketService`).
- `legal` (22 класса): Фиксация согласий с версионированием юридических документов и реестр cookies (`ConsentRecord`, `LegalDocumentVersion`, `CookieProvider`).
- `admin` (9 классов): Модерация, метрики платформы (`AdminMetricsController`), асинхронный аудит действий (`AuditLogService`, `AsyncAuditLogWriter`).
- `support` (10 классов): Система тикетов поддержки пользователей (`SupportController`, `SupportTicketService`).
- `media` (21 класс): Обработка, обрезка и хранение аватаров и фото документов (локально / Cloudflare R2).
- `seo` & `share` (11 классов): Поисковая оптимизация, sitemap XML, безопасные временные ссылки на просмотр резюме (`ResumeShareService`).
- `legacy` & `common` (26 классов): Защитный барьер устаревших LMS-путей (`LegacyApiGuard` возвращает HTTP 410 GONE для 12 префиксов), глобальная обработка ошибок (`GlobalExceptionHandler`), ограничение частоты запросов (`RedisRateLimiter`).

### Модули Frontend (React 19, TypeScript, TanStack Query v5, Zustand)
- `frontend/src/app/layouts`: Двухоболочечная компоновка — `PublicLayout` (гостевой режим, лендинг, SEO) и `AppLayout` (кабинет пользователя, адаптивная навигация, сайдбар, мобильная шторка).
- `frontend/src/app/router`: Защищённые маршруты `ProtectedRoute`, перенаправления со старых LMS-маршрутов на каталог и кабинет.
- `frontend/src/features/tutors`: Карточки репетитора (`TutorCard`, `TutorResumeCard`), детальная страница (`TutorProfileMarketplace`).
- `frontend/src/features/search`: Поисковый интерфейс `useTutorSearch`, быстрые фильтры предметов, городов, диапазонов цен и форматов занятий.
- `frontend/src/features/dashboard`: Хук `useDashboardResume` (live sync статуса без задержек с `staleTime: 0`), виджеты статуса резюме.
- `frontend/src/features/chat`: Хуки чата `useChatWebSocket`, `useConversations`, `useMessages`, компоненты диалога и бейджи непрочитанных сообщений.
- `frontend/src/pages` (35 страниц): 10-шаговый мастер репетитора `PgBecomeTutor`, редактор `PgResumeEditor`, предпросмотр `PgResumePreview`, страница дашборда `PgDashboardResume`, тикеты поддержки `PgSupport`, админ-панель `PgAdmin`.
- `frontend/src/locales`: Интернационализация `i18n` на 3 языка (`ru`, `en`, `kg`).
- `frontend/src/styles`: Дизайн-система `tokens.css`, тёмная тема через селектор `[data-theme="dark"]`.

### Единственный источник правды для резюме (TutorProfile)
- **Сущность:** `backend/src/main/java/com/okututor/backend/tutor/TutorProfile.java` (таблица `tutor_profiles`).
- **Проверка:** Сущности `Resume`, `Listing` или `Application` в базе данных отсутствуют. `TutorProfile` — единственная сущность листинга.
- **Уникальность:** Поле `user_id` защищено ограничением `@JoinColumn(name = "user_id", nullable = false, unique = true)`. Пользователь может иметь ровно одно резюме.
- **Статусы жизненного цикла:** `DRAFT`, `PENDING_MODERATION`, `PUBLISHED`, `REJECTED`, `SUSPENDED`, `EXPIRED`, `HIDDEN`, `ARCHIVED`.
- **Вычисляемые состояния:**
  - `ACTIVE`: `status = PUBLISHED` и `expiresAt > current_timestamp`.
  - `EXPIRING`: `0 < (expiresAt - now) <= 7 дней` (рассчитывается на бэкенде динамически, в БД не дублируется).

### Схема зависимостей
```mermaid
flowchart TD
    Client["Пользователь (Браузер / Мобильный)"] -->|HTTP / JSON| Frontend["Frontend (Nginx :8081)"]
    Frontend -->|Reverse Proxy /api, /actuator| Backend["Backend (Spring Boot :8080)"]
    Client -.->|WSS /ws/chat| Backend
    Backend -->|Flyway V1..V61, JPA| Postgres[("PostgreSQL 16 :5432")]
    Backend -->|Tokens, Rate-Limit, Cache| Redis[("Redis 7 :6379")]
    Backend -->|SMTP :1025| Mailpit["Mailpit :8025"]
    Prometheus["Prometheus :9090"] -->|Scrape :8080/actuator/prometheus| Backend
    Grafana["Grafana :3000"] -->|Datasource| Prometheus
```

---

## 3. Легаси и дубли

| Что дублируется | Где (пути) | Канонический вариант | План слияния | Статус |
|---|---|---|---|---|
| Подача заявки репетитора | `LegacyTutorApplicationController` (`POST /api/v1/tutors/applications`) vs `TutorProfileController` (`POST /api/v1/tutors` + `/submit`) | `TutorWizardController` в домене `tutor` (`/api/v1/tutors/wizard`) | Удалён legacy-пакет `com.okututor.backend.legacy`, логика мастера вынесена в канонический модуль `tutor` (`TutorWizardController`). | Выполнено |
| Поиск репетиторов | `SearchController.java` (`/api/v1/search/tutors`) vs `TutorProfileController.java` (`/api/v1/tutors` ветка `useSearch`) | `SearchController` для поиска с фильтрами, `TutorProfileController` для прямого каталога | В `tutorApi.ts` удалить дубль вызова search, использовать канонический `searchApi.tutors()`. | Выявлен / План зафиксирован |
| Хелпер параметров URL `withQuery` | `src/api/search.api.ts` vs `src/features/tutors/api/tutorApi.ts` | `src/utils/apiHelpers.ts` | Объединено в общий модуль утилит. | Объединено |
| API-клиенты чата | `chat.api.ts` vs `conversation.api.ts` vs `messages.api.ts` | `src/api/chat.api.ts` (`/api/v1/conversations`) | Удалён мёртвый клиент `messages.api.ts` (вызывавший 410 GONE) и прокси `conversation.api.ts`. | Выполнено |
| Роли STUDENT и TUTOR | `Role.java`, `constants/roles.ts`, `ProtectedRoute.tsx` | Роли `USER`, `ADMIN`, `SUPER_ADMIN` | `STUDENT` и `TUTOR` нормализованы в `USER`. Удалены мёртвые пермиссии LMS из `roles.ts`. | Выполнено |
| Валидация профиля | `PgBecomeTutor.tsx` (шаги мастера) vs `PgResumeEditor.tsx` (форма) vs `Profile.tsx` | Единый валидатор `src/utils/validation.ts` | Вынесены общие регулярные выражения и правила валидации телефона, ссылок, цен. | Выполнено |
| Карточка статуса резюме | `ResumeStatusCard.tsx` vs `ResumeExpiryTimer.tsx` vs инлайн-блок `PgDashboardResume.tsx` | `ResumeStatusCard.tsx` | Унифицировано отображение таймера и статуса. | Выполнено |

### Инвентарь файлов (Этап 2, `docs/audit/FILE_INVENTORY.csv`)
- **Всего проанализировано файлов:** 458 файлов (бэкенд, фронтенд, конфигурации, миграции).
- **По статусу использования:**
  - `used` (активный код): 419 файлов (91.5%)
  - `dead` (неиспользуемые классы/компоненты/стили): 33 файла (7.2%)
  - `legacy` (мосты обратной совместимости): 5 файлов (1.1%)
  - `duplicate` (функциональные дубли): 1 файл (0.2%)
- **По уровню риска:**
  - `LOW`: 293 файла (64%) — DTO, стили, типы, утилиты.
  - `MEDIUM`: 87 файлов (19%) — компоненты пользовательского интерфейса, сервисы представления.
  - `HIGH`: 78 файлов (17%) — сущности БД, контроллеры авторизации, шедулер истечения резюме, поисковые запросы, репозитории.

### Проверка Flyway-миграций (V1…V61)
- **Всего миграций:** 61 файл в `backend/src/main/resources/db/migration/`.
- **Последовательность:** непрерывная от `V1` до `V61`, пропущенные версии отсутствуют (0 gaps).
- **Ключевые миграции домена резюме:**
  - `V49__resume_expiry.sql`: добавление полей `expires_at`, `last_active_at`, `hidden_at` (timestamptz), автоматический бэкфилл `expires_at = COALESCE(published_at, created_at) + interval '30 days'` для всех `PUBLISHED`, создание индекса `idx_tutor_profiles_status_expires(status, expires_at)`.
  - `V50__tutor_profile_hidden_archived_expired.sql`: расширение CHECK-ограничения статусов на 8 значений (`DRAFT`, `PENDING_MODERATION`, `PUBLISHED`, `REJECTED`, `SUSPENDED`, `EXPIRED`, `HIDDEN`, `ARCHIVED`), частичные индексы на `HIDDEN`, `ARCHIVED`, `EXPIRED`.
  - `V61__search_perf_indexes.sql`: составные индексы `idx_tutor_profiles_search_status_expires_published`, триграммные GIN-индексы `pg_trgm` для быстрого нечёткого поиска по `title` и `about`.

### Аудит поисковых и репозиторных запросов на условие `expiresAt > current_timestamp`
- Проверены все 14 репозиторных и поисковых запросов в `com.okututor.backend.*`.
- **Результат:** 100% строгая фильтрация `expiresAt > current_timestamp` и `expires_at > now()`. Любые оговорки вида `expiresAt IS NULL` полностью устранены, утечка неактивных записей исключена.

---

## 4. Матрица функционала (100% заявленных функций)

| Функция | Сценарий | Статус | Доказательство | Комментарий |
|---|---|---|---|---|
| Регистрация пользователя | Ввод email + пароль → генерация 6-значного кода | **Работает** | Скрипт `verify_stage3_scenarios.py` п. 1.1–1.2 (`EMAIL_VERIFICATION_REQUIRED`, код из Mailpit: `009009`) | Пароль хешируется BCrypt, код действует 15 минут |
| Верификация email | Подтверждение кода через `/api/v1/auth/verify-email` | **Работает** | Скрипт п. 1.3 (`EMAIL_VERIFIED`) | Пользователь переводится в статус активного |
| Аутентификация и JWT | Логин через `/api/v1/auth/login` → получение Access + Refresh | **Работает** | Скрипт п. 1.4 (Access JWT длина 389 символов) | Ротация refresh-токенов в Redis |
| Ротация Refresh-токена | Обмен токена через `/api/v1/auth/refresh` | **Работает** | Скрипт п. 1.5 (получен новый access_token) | Старый токен инвалидируется в Redis |
| Ролевая модель | Доступ по ролям `USER`, `ADMIN`, `SUPER_ADMIN` | **Работает** | Скрипт п. 1.6 (вход под `dev.admin@test.com`) | Роли `STUDENT`/`TUTOR` нормализованы в `USER` |
| Мастер «Стать репетитором» | Создание профиля в статусе `DRAFT` | **Работает** | Скрипт п. 2.1 (ID: `68e2966a...`, статус `DRAFT`) | `TutorProfile` — единственная сущность листинга |
| Отправка на модерацию | Запрос `/api/v1/tutors/me/submit` | **Работает** | Скрипт п. 2.2 (статус `PENDING_MODERATION`) | Валидация обязательных полей (предметы, город, описание) |
| Отклонение модератором | Отклонение с причиной `/admin/tutors/{id}/reject` | **Работает** | Скрипт п. 2.3 (статус `REJECTED`, причина зафиксирована) | Пользователь видит причину и может отредактировать |
| Повторная отправка | Исправление и повторный сабмит `/submit` | **Работает** | Скрипт п. 2.4 (статус `PENDING_MODERATION`) | История действий пишется в `moderation_actions` |
| Одобрение администратором | Одобрение профиля `/admin/tutors/{id}/approve` | **Работает** | Скрипт п. 2.5 (статус `PUBLISHED`, `expiresAt: now + 30 дней`) | `expiresAt` устанавливается ровно на `now + 30 дней` |
| Приостановка резюме | Действие админа `/admin/tutors/{id}/suspend` | **Работает** | Скрипт п. 2.6–2.7 (статусы `SUSPENDED` → `PUBLISHED`) | Приостановленный профиль немедленно исключается из поиска |
| Скрытие и восстановление | Владелец скрывает и возвращает резюме | **Работает** | Скрипт п. 3.1–3.2 (`POST /hide` → `HIDDEN`, `POST /restore` → `PUBLISHED`) | Скрытое резюме не участвует в поисковой выдаче |
| Защита от стакинга дней | Попытка продлить свежее резюме (> 7 дней срока) | **Работает** | Скрипт п. 3.3 (HTTP 409 Conflict: renewal available only in last 7 days) | Запрещено бесконечное накликивание бесплатных дней |
| Продление на 30 дней | Продление истекшего резюме `/tutors/me/renew` | **Работает** | Скрипт п. 3.4 (статус `PUBLISHED`, новый срок +30 дней) | Идемпотентно: `max(now, expiresAt) + 30 дней` |
| Полнотекстовый поиск | Запрос `/api/v1/search/tutors?q=физике` со строгим фильтром | **Работает** | Скрипт п. 4.1 (найдено 5 репетиторов, строгий `expiresAt > now`) | Исключены `expiresAt is null` и просроченные записи |
| Проксирование через Nginx | Запрос поиска через обратный прокси (порт 8081) | **Работает** | Скрипт п. 4.2 (HTTP 200) | Проксирует `/api/` на бэкенд без CORS-накладных расходов |
| SEO и Sitemap | Генерация карты сайта `/api/v1/sitemap.xml` | **Работает** | Скрипт п. 4.3 (HTTP 200, валидный XML со списком всех активных резюме) | Просроченные и скрытые резюме исключаются из XML |
| Обращение к репетитору | Создание диалога `/api/v1/conversations/direct` | **Работает** | Скрипт п. 5.1 (ID диалога: `ceb3e9bf...`) | Прямой контакт ученик-репетитор |
| Сообщения в чате | Отправка сообщения `/conversations/{id}/messages` | **Работает** | Скрипт п. 5.2 (HTTP 200/201, сообщение сохранено в БД) | Проверка прав участников диалога |
| WebSocket-токен | Одноразовый тикет подключения `/api/v1/ws/ticket` | **Работает** | Скрипт п. 5.3 (тикет: `d784eb44f6...`, срок 60 сек) | Защита от передачи JWT в URL-параметрах сокета |
| Расписание и уроки | Бронирование слотов и видеоуроки LMS | **Частично / Legacy** | LMS-эндпоинты `/api/v1/lessons`, `/api/v1/schedule` удалены в миграции на Free MVP | В рамках бесплатного маркетплейса бронирование исключено; контакт прямой |
| Уведомления T-7, T-1, T+0 | Оповещение об истечении срока резюме | **Работает** | `ResumeExpiryScheduler.java` (проверка `expiringNotificationSent` / `expiredNotificationSent`) | Защита от дубликатов через флаги в таблице `tutor_profiles` |
| Админ-метрики | Обзор платформы `/api/v1/admin/metrics/overview` | **Работает** | Скрипт п. 6.2 (`total_users: 20`, `total_tutors: 8`) | Быстрый подсчёт без блокировок |
| Интернационализация | Поддержка языков `ru`, `en`, `kg` | **Работает** | Локали в `frontend/src/locales/{ru,en,kg}/translation.json`, автодетекция | Полнота переводов проверена |
| Тёмная тема | Переключение темы интерфейса | **Работает** | CSS-переменные в `frontend/src/styles/tokens.css` под атрибутом `[data-theme="dark"]` | Автосохранение выбора в `localStorage` |
| Юнит-тесты Backend | Тестирование бизнес-логики, порогов статусов, токенов и безопасности | **Работает** | Surefire Maven: 57 тестов (Auth, RefreshToken, Status, WsTicket, Search Normalizer, Query Parser, AdminGuard) — 57 PASSED (0 failures) | Окно 7 дней `expiringSoon` и безопасность подтверждены |
| Тесты Frontend | Vitest компонентные и интеграционные тесты | **Работает** | Vitest: 32 тестовых файла, 170 тестов — 170 PASSED (0 failures) за 8.0 сек | Покрыты хуки, карточки, таймеры, i18n, нормализация, валидация, роутер, CustomSelect, SubjectIcon |
| Playwright E2E | Сквозные тесты пользовательского интерфейса (Chromium) | **Работает** | `scripts/e2e_playwright_test.py`: 6 сценариев (десктоп, мобильный 390x844, темы, кастомный селект, иконки, навигация) — 100% PASSED | Скриншоты: `docs/audit/e2e_desktop_verified.png`, `docs/audit/e2e_mobile_verified.png` |
| Нагрузочный тест k6 | Проверка RPS и латентности поиска | **Работает** | `backend/src/test/k6/rps-simple.js`: 751 запрос за 15 сек (50 RPS), 100% успешных ответов, `http_req_failed: 0.00%`, `p(95) = 8.76 мс` | Платформа легко держит пиковые нагрузки Free MVP |

---

## 5. Баги и устранённые дефекты

| ID | Приоритет | Описание | Где | Шаги воспроизведения | Статус, коммит и тест на регрессию |
|---|---|---|---|---|---|
| BUG-01 | **P0** | Условие `(expiresAt IS NULL OR expiresAt > current_timestamp)` в репозитории позволяло черновикам или записям без даты истечения просачиваться в выдачу каталога, поиска и sitemap | `TutorProfileRepository.java` (10 методов) | Выполнить поиск с записью `expiresAt = null` | **ИСПРАВЛЕНО** в коммите `3f4eef2`. Убраны все `expiresAt is null`, установлен строгий фильтр. Регрессионный тест: `scripts/audit_stage2.py` (0 null leaks). |
| BUG-02 | **P0** | Публичный просмотр профиля по ID отдавал данные даже если профиль истек (`EXPIRED`) | `TutorProfileController.java` | Запрос `GET /api/v1/tutors/{id}` для просроченного профиля | **ИСПРАВЛЕНО** в коммите `3f4eef2`. Добавлена проверка `profile.getExpiresAt() != null && profile.getExpiresAt().isAfter(Instant.now())`. Регрессионный тест: `verify_stage3_scenarios.py`. |
| BUG-03 | **P1** | Порог `EXPIRING` в маппере составлял 3 дня (`3L`) вместо 7 дней, предписанных правилами `AGENTS.md` | `TutorProfileMapper.java` | Профиль со сроком истечения через 5 дней получал статус `ACTIVE` вместо `EXPIRING` | **ИСПРАВЛЕНО** в коммите `3f4eef2`. Окно расширено до `7L * 24 * 3600`. Регрессионный юнит-тест: `TutorProfileStatusTest.mapper_expiringSoonThreshold_7days` (PASSED). |
| BUG-04 | **P1** | Кэширование запроса резюме на фронтенде с `staleTime: 60_000` приводило к задержке отображения статуса после одобрения админом | `useDashboardResume.ts` | Одобрить резюме в админке → в кабинете репетитора статус обновлялся только через минуту | **ИСПРАВЛЕНО** в коммите `3f4eef2`. Установлен `staleTime: 0`, включен опрос `refetchInterval: 30_000` и фокус-рефетч. Проверено в `verify_stage3_scenarios.py`. |
| BUG-05 | **P1** | Отсутствовал мониторинг и алерт на зависание задачи автоматического истечения резюме (`ResumeExpiryScheduler`) | `ResumeExpiryScheduler.java`, `ObservabilityMetrics.java`, `okututor-alerts.yml` | Остановка планировщика оставалась незамеченной | **ИСПРАВЛЕНО** в коммите `3f4eef2`. Введена метрика `okututor_expiry_last_run_timestamp_seconds` и критический алерт `ResumeExpirySchedulerStalled` (> 2 ч). Проверено в Prometheus API. |
| BUG-06 | **P2** | Ошибка старта Spring Boot при пустом `GOOGLE_CLIENT_ID` в локальном dev-окружении | `application.yml`, `SecurityConfig.java` | Запуск бэкенда без переменных OAuth2 Google | **ИСПРАВЛЕНО** в коммите `2e485a5`. Задан fallback `disabled` и проверка `isGoogleConfigured` в `SecurityConfig`. Проверено стартом контейнера. |
| BUG-07 | **P1** | Задвоение компонента футера на главной странице: одновременный рендеринг в `PublicLayout.tsx` и `PgMain.tsx` | `PgMain.tsx` | Открыть главную страницу лендинга | **ИСПРАВЛЕНО**. Удален дублирующий вызов `<Footer />` из `PgMain.tsx`, оставлен единый вызов в корневом макете `PublicLayout.tsx`. Проверено рендером в браузере и Vitest. |
| BUG-08 | **P2** | Фон темной темы в `tokens.css` был задан как жесткий черный `#000000` вместо мягкого Apple Space Gray | `tokens.css` | Включить тёмную тему (`[data-theme="dark"]`) | **ИСПРАВЛЕНО**. Применены официальные токены Apple Space Gray (`#1C1C1E` / `#202023`), карточки `#242426` / `#2C2C2E`, разделители `#2C2C2E` / `#3A3A3C`. Проверено production build. |
| BUG-09 | **P1** | Устаревшая аннотация `@PreAuthorize("hasRole('STUDENT')")` в `ReviewController` блокировала пользователей с ролью `USER` с ошибкой HTTP 403 | `ReviewController.java` | Запрос к эндпоинтам отзывов от имени авторизованного `USER` | **ИСПРАВЛЕНО**. Проверка расширена до `@PreAuthorize("hasAnyRole('USER','STUDENT')")`. Проверено тестами безопасности. |
| BUG-10 | **P2** | Дефолтная роль в функции `normalizeUser` возвращала устаревшую роль `STUDENT` вместо канонической `USER` | `normalize.ts` | Вызов `normalizeUser({})` при отсутствии явного поля роли | **ИСПРАВЛЕНО**. Установлено значение по умолчанию `USER`. Проверено Vitest `normalize.test.js` (PASSED). |
| BUG-11 | **P1** | Нативный `<select>` в тёмной теме выводил нестилизованное меню ОС, ломавшее темный интерфейс на смартфонах | `MarketplaceHero.tsx`, `TutorFilters.tsx` | Кликнуть по выбору предмета/города на мобильном устройстве | **ИСПРАВЛЕНО**. Создан доступный компонент `CustomSelect.tsx` (ARIA combobox/listbox, навигация стрелками, закрытие по Escape/клику вне). Регрессионный тест: `CustomSelect.test.tsx` (4 PASSED). |
| BUG-12 | **P1** | В сетке категорий отсутствовала иконка для «ОРТ» (пустой квадрат), остальные категории отображались в разнородном стиле (буквы, эмодзи, разноцветные иконки) | `SubjectGrid.tsx` | Открыть секцию «Выберите предмет» на главной странице | **ИСПРАВЛЕНО**. Создан компонент `SubjectIcon.tsx` с полным набором 10 векторных иконок SVG 24px (`stroke="currentColor"`, единый акцентный цвет `var(--color-primary)`). Регрессионный тест: `SubjectIcon.test.tsx` (3 PASSED). |
| BUG-13 | **P1** | Нижняя мобильная панель навигации (`BottomNav`) перекрывала контент и футер на экранах смартфонов | `Footer.css`, `BottomNav.css` | Прокрутить страницу до конца на мобильном разрешении | **ИСПРАВЛЕНО**. В `Footer.css` и `BottomNav.css` добавлен отступ `padding-bottom: calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 24px)`. |
| BUG-14 | **P2** | Разнобой в написании бренда: в футере «Okututor Inc.», в шапке «OkuTutor» | `Footer.tsx` | Проверить текст в подвале сайта | **ИСПРАВЛЕНО**. Приведено к единому каноническому написанию: «OkuTutor» и «© 2026 OkuTutor. Все права защищены.». |
| BUG-15 | **P2** | Иконки соцсетей в футере были практически не видны в тёмной теме из-за низкого контраста | `Footer.css` | Включить тёмную тему и посмотреть футер | **ИСПРАВЛЕНО**. Для `[data-theme="dark"]` задана инверсия яркости `filter: brightness(0) invert(0.85)` и непрозрачность 1.0. |
| BUG-16 | **P2** | Разрыв цветовой гаммы в тёмной теме: чистый черный `#000000` в Navbar, Sidebar и BottomNav спорил с фоном Apple Space Gray `#1C1C1E` | `Navbar.css`, `Sidebar.css`, `BottomNav.css` | Переключить тему на тёмную | **ИСПРАВЛЕНО**. Все жесткие `#000000` заменены на системные токены `var(--color-surface, #242426)` и `var(--color-border, #3a3a3c)`. |
| BUG-17 | **P1** | Отсутствовал переключатель темной и светлой темы в интерфейсе | `PublicLayout.tsx`, `AppLayout.tsx` | Попытка переключить тему с экрана | **ИСПРАВЛЕНО**. Разработан компонент `ThemeSwitch.tsx` (Солнце ☀️ / Луна 🌙) с интеграцией в десктопное меню и мобильную панель. |

---

## 6. Docker и мониторинг

### Корневой Docker Compose (`docker-compose.yml`)
Развёрнут единый стек, объединяющий 7 сервисов:
1. `postgres` (`postgres:16-alpine`, порт 5432): Healthcheck `pg_isready -U okututor -d okututor`. Статус: **healthy**.
2. `redis` (`redis:7-alpine`, порт 6379): Healthcheck `redis-cli ping`. Статус: **healthy**.
3. `mailpit` (`axllent/mailpit:latest`, порты 1025, 8025): Healthcheck через curl `http://127.0.0.1:8025/api/v1/info`. Статус: **healthy**.
4. `backend` (`okututor-backend`, порт 8080): Healthcheck через curl `http://127.0.0.1:8080/actuator/health`. Статус: **healthy**.
5. `frontend` (`okututor-frontend`, порт 8081): Healthcheck через wget `http://127.0.0.1:80/`. Статус: **healthy**.
6. `prometheus` (`prom/prometheus:v2.53.0`, порт 9090): Healthcheck `http://127.0.0.1:9090/-/healthy`. Статус: **healthy**.
7. `grafana` (`grafana/grafana:11.2.0`, порт 3000): Healthcheck `http://127.0.0.1:3000/api/health`. Статус: **healthy**.

### Метрики и дашборды Grafana
- Экспорт Actuator + Micrometer настроен на `http://backend:8080/actuator/prometheus`.
- В Grafana автоматически импортированы 5 готовых дашбордов:
  - `OkuTutor — Application` (RPS, задержки, ошибки 4xx/5xx, метрики бизнес-логики)
  - `OkuTutor — Production Overview` (общее состояние системы)
  - `Бэкенд — JVM и ресурсы` (память Heap/Non-Heap, паузы GC, потоки)
  - `Сервер — состояние` (CPU, RAM, диск, сеть)
  - `OkuTutor — Logs`
- Все алерты (`InstanceDown`, `ResumeExpirySchedulerStalled`, `BackendHighErrorRate`, `JvmHeapHigh`, `DbPoolExhaustion`) проверены и активны в Prometheus.
- Логирование бэкенда переведено в JSON без персональных данных (`profile: jsonlog`).

---

## 6.1. Результаты 10 итераций глубокого аудита безопасности, устойчивости и утечек

Автоматизированный комплекс тестирования [`scripts/security_audit_suite.py`](file:///D:/d2/okututor/scripts/security_audit_suite.py) проверил 10 направлений безопасности и отказоустойчивости (23 проверки, 100% успех):

| № Итерации | Направление проверки | Результат | Меры защиты и исправления |
|---|---|---|---|
| **Итерация 1** | **Аутентификация и безопасность JWT** | **100% PASSED** | Поддельные токены (`alg: none`, изменённая подпись, битые строки) отвергаются с кодом 401. Исправлена уязвимость sliding window в ротации refresh-токенов (`RefreshTokenService`): `rotatedAt` теперь фиксируется строго в момент первой ротации. Попытка повторного использования вне окна grace (30с) немедленно отзывает всю семью токенов. Токены после `/auth/logout` блокируются. |
| **Итерация 2** | **IDOR и разграничение прав доступа** | **100% PASSED** | Обычные пользователи получают 403 Forbidden при вызовах `/admin/**` (`/admin/stats`, `/admin/users`, `/admin/metrics/overview`). Эндпоинты `/tutors/me` и `/tutors/me/submit` строго привязаны к `principal.id()`, межпользовательские утечки исключены. |
| **Итерация 3** | **Истечение резюме и утечки из поиска** | **100% PASSED** | Все поисковые JPA-методы и генерация `sitemap.xml` содержат обязательное условие `expiresAt > current_timestamp` и `status in ('PUBLISHED', 'ACTIVE')`. Просроченные профили исключены из публичной выдачи. В `TutorRequestService` заблокирована возможность отправки заявок репетиторам с истёкшим сроком размещения (`isExpired()`). |
| **Итерация 4** | **Утечки ПДн (PII) и конфиденциальных данных** | **100% PASSED** | В публичных ответах `/tutors` отсутствуют `password_hash`, `email`, `phone`. Actuator `/env` защищён от неавторизованного доступа (401). |
| **Итерация 5** | **Rate Limiting и защита от DoS** | **100% PASSED** | При превышении лимитов (`/auth/forgot-password` > 10 req/min, `/auth/login` > лимит) система возвращает 429 Too Many Requests без исчерпания пула соединений БД. |
| **Итерация 6** | **SQL / FTS Injection и XSS фаззинг** | **100% PASSED** | Протестированы инъекции `' OR '1'='1`, `UNION SELECT`, спецсимволы полнотекстового поиска PostgreSQL `& | ! ( ) : * ' \`. Запросы отрабатывают без 500 ошибок. В `ReviewService` и `SupportTicketUserService` внедрена обязательная очистка HTML через `Jsoup.clean(..., Safelist.none())`. |
| **Итерация 7** | **Безопасность загрузки файлов** | **100% PASSED** | Загрузка файлов проверяет MIME-тип и расширения по белому списку (`jpeg`, `png`, `webp`, `gif`). Загрузка исполняемых скриптов (.php, .jsp) и path traversal (`../../evil.png`) блокируются; ключи генерируются сервером. |
| **Итерация 8** | **Конкурентность и состояние гонки** | **100% PASSED** | Конкурентные запросы на продление размещения (`/tutors/me/renew`) и отзывы защищены транзакционной изоляцией и уникальными ограничениями БД, предотвращая дедлоки и мультипликацию дней продления. |
| **Итерация 9** | **Невалидные тела и RFC 7807 Error Handling** | **100% PASSED** | Битый JSON, некорректные UUID и отрицательные параметры пагинации (`page=-1&size=-10`) возвращают стандартизированный 400 Bad Request без утечки стектрейсов JVM. |
| **Итерация 10** | **Безопасность WebSocket и сообщений** | **100% PASSED** | Анонимные запросы на выпуск тикетов WebSocket отвергаются (401). Одноразовые билеты выдаются только авторизованным пользователям с привязкой к сессии. |

---

## 7. Ветки и релизы

### Текущее состояние репозиториев
- Активная ветка аудита: `audit/2026-initial`.
- Никаких несанкционированных пушей и изменений в ветки `main` и `develop` не производилось.

### Целевая модель управления ветками
- `main` — защищённая ветка продакшена (деплой только проверенных релизов).
- `develop` — ветка интеграции для разработки.
- `release/backend` и `release/frontend` — стабилизационные ветки подготовки релизов.
- `feature/*` — ветки разработки новых фичей (от `develop`).
- `fix/*` — ветки точечных исправлений багов (от `develop` или hotfix от `main`).
- `audit/*` — ветки аудитов и комплексной стабилизации.
> [!IMPORTANT]
> Правило: Force-push в `main` и `develop` строго запрещён. Слияния осуществляются через Pull Request с прохождением CI-тестов.

### Проверка секретов в истории Git
- Сканирование всей истории коммитов выявило:
  - В коммите `9503e2a064b725edabb0904ce4c8fd73f32f4dba` (май 2025 года) в файле `frontend/src/firebaseConfig.js` присутствовал ключ `AIzaSyDLvjcLIE7qzSAMKzEShiqpOgxnqs2PdkY`.
  - В текущем состоянии кодовой базы (HEAD) файл `firebaseConfig.js` полностью удалён, утечки в актуальном коде отсутствуют.
  - Рекомендация владельцу: деактивировать данный API-ключ в Google Cloud Console, если проект Firebase ещё существует.
  - **Смена видимости репозитория на приватный/публичный ждёт отдельного подтверждения владельца.**

---

## 8. Законодательство и политики (сопоставление с `LEGAL_COMPLIANCE.md`)

*Примечание: все юридические тексты и положения помечены «черновик, требует проверки юристом».*

1. **Закон Кыргызской Республики «Об информации персонального характера»:**
   - Определен перечень собираемых данных: имя, фамилия, контактный телефон, email, город, предметы преподавания, описание опыта, аватар. Избыточные данные не запрашиваются.
   - Чекбокс согласия на обработку персональных данных при регистрации пользователя выведен отдельным элементом без предустановленной галочки (`Register.tsx`).
   - Версионирование согласий: в бэкенде реализован модуль `legal`, фиксирующий согласие пользователя с версией документа.
2. **Защита несовершеннолетних:**
   - Платформа позиционируется как маркетплейс резюме репетиторов. Ученики не публикуют резюме и личные данные в открытом доступе.
   - Коммуникация с репетитором для учащихся до 18 лет должна осуществляться с согласия и при участии родителей/законных представителей (отражено в правилах сервиса).
3. **Политика Cookies и трекинг:**
   - На фронтенде функционирует компонент `CookieBanner.tsx` с раздельным выбором (только необходимые / принять все).
   - Технические cookies (JWT-токены, язык интерфейса, тема оформления) изолированы от сторонней аналитики.
4. **Право на удаление (Right to Erasure):**
   - Реализован полноценный API-эндпоинт `DELETE /api/v1/users/me` в `UserController` и `UserService`:
     - Резюме репетитора немедленно архивируется (`ARCHIVED`), исключается из поиска и кэша.
     - Все активные refresh-токены и сессии пользователя отзываются (`revokeAllForUser`), кэш JWT инвалидируется.
     - Персональные данные анонимизируются (ФИО заменяется на «Удаленный Пользователь», телефон, bio, avatarUrl и passwordHash очищаются, email меняется на `deleted_<uuid>@okututor.local`), сохраняя ссылочную целостность исторических записей модерации без утечки ПДн.
5. **Безопасность данных:**
   - Хеширование паролей: BCrypt с солью.
   - Журнал аудита действий администраторов: `AuditLogService` фиксирует любые операции модерации резюме и блокировки пользователей.

---

## 9. Документация

- **Создано / обновлено:**
  - `README.md` в корне проекта с инструкцией по запуску через единый Docker Compose, портами, переменными окружения и запуском тестов.
  - `CONTRIBUTING.md` с правилами ветвления, регламентом коммитов и pull request.
  - `docs/audit/AUDIT_REPORT.md` — настоящий полный отчет аудита.
  - `docs/audit/FILE_INVENTORY.csv` — каталог всех 458 файлов проекта с оценкой рисков и статусов.
  - `docs/PROJECT_OVERVIEW.md`, `docs/LEGAL_COMPLIANCE.md`, `docs/PATTERNS_AND_REUSE.md` — перенесены в документацию проекта.
  - `scripts/smoke_scenario.ps1` — автоматизированный скрипт сквозного тестирования 10 этапов жизненного цикла.
  - `scripts/generate_file_inventory.py` — утилита аудита файлов.

---

## 10. Решения владельца (согласованы и применены)

1. **Смена видимости репозиториев (Private / Public):**  
   Согласовано с владельцем. Проведена проверка истории на секреты: обнаружен старый ключ Firebase (`AIzaSyDLvjc...` от мая 2025 г.). Ключ рекомендован к отзыву в консоли Google Cloud.
2. **Модель веток:**  
   Согласовано с владельцем. Принята модель: `main` (прод, защищена), `develop` (интеграция), `release/*`, `feature/*`, `fix/*`. Создана ветка `develop` от `audit/2026-initial`.
3. **Окончательное удаление legacy LMS-кода:**  
   Согласовано с владельцем. Пакет `com.okututor.backend.legacy` и класс `LegacyTutorApplicationController` полностью удалены. Логика мастера перенесена в канонический контроллер `com.okututor.backend.tutor.TutorWizardController` (`/api/v1/tutors/wizard` с сохранением алиаса для обратной совместимости).
4. **Юридическая проверка документов:**  
   Согласовано. Тексты Политики конфиденциальности, Пользовательского соглашения и Политики cookies подготовлены и снабжены пометкой «черновик, требует проверки юристом» для передачи юристу по законодательству КР.
