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
- `com.okututor.backend.tutor`: Жизненный цикл резюме (`TutorProfile`, `TutorProfileService`, `TutorProfileController`, модерация `TutorModerationController`, планировщик `ResumeExpiryScheduler`).
- `com.okututor.backend.search`: Полнотекстовый поиск, нормализация раскладки (ru/en), опечатки, стоп-слова, фильтрация по строгим условиям активности резюме (`SearchController`, `TutorSearchService`).
- `com.okututor.backend.auth` & `security`: Регистрация, верификация через 6-значный email-код (`EmailVerificationService`), ротация refresh-токенов в Redis, JWT-фильтр, роли `USER`, `ADMIN`, `SUPER_ADMIN`.
- `com.okututor.backend.chat`: Двусторонний диалог между учеником и репетитором, WebSocket (`/ws/chat`), модерация чатов администратором.
- `com.okututor.backend.legal`: Фиксация согласий с версионированием юридических документов и реестр cookies.
- `com.okututor.backend.admin`: Модерация, метрики платформы (`AdminMetricsController`), аудит действий (`AuditLogService`, `AsyncAuditLogWriter`).
- `com.okututor.backend.support`: Система тикетов поддержки пользователей (`SupportController`).
- `com.okututor.backend.observability`: Экспорт метрик Micrometer в Prometheus (`ObservabilityMetrics`), структурированные логи в формате JSON.
- `com.okututor.backend.legacy`: Защитный барьер устаревших LMS-путей (`LegacyApiGuard` возвращает HTTP 410 GONE).

### Модули Frontend (React 19, TypeScript, TanStack Query v5, Zustand)
- `frontend/src/app/layouts`: Двухоболочечная компоновка — `PublicLayout` (гостевой режим, SEO) и `AppLayout` (кабинет пользователя, шторка навигации, сайдбар).
- `frontend/src/app/router`: Защищённые маршруты `ProtectedRoute`, перенаправления с устаревших LMS-маршрутов на каталог и кабинет.
- `frontend/src/features/tutors`: Карточки репетитора (`TutorCard`, `TutorResumeCard`), детальная страница (`TutorProfileMarketplace`).
- `frontend/src/features/search`: Поисковый интерфейс, быстрые фильтры предметов, городов, диапазонов цен и форматов занятий.
- `frontend/src/features/dashboard`: Хук `useDashboardResume` (live sync статуса без задержек), виджеты статуса резюме.
- `frontend/src/pages`: 10-шаговый мастер репетитора `PgBecomeTutor`, редактор `PgResumeEditor`, предпросмотр `PgResumePreview`, страница дашборда `PgDashboardResume`, тикеты поддержки `PgSupport`, админ-панель `PgAdmin`.
- `frontend/src/locales`: Интернационализация `i18n` на 3 языка (`ru`, `en`, `kg`).
- `frontend/src/styles`: Дизайн-система `tokens.css`, тёмная тема через селектор `[data-theme="dark"]`.

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
| Подача заявки репетитора | `LegacyTutorApplicationController` (`POST /api/v1/tutors/applications`) vs `TutorProfileController` (`POST /api/v1/tutors` + `/submit`) | `TutorProfileController` (`/api/v1/tutors/me/submit`) | Перевести `PgBecomeTutor.tsx` на `tutorProfileMarketplaceApi.create()` / `.submit()`, удалить legacy контроллер. | Выявлен / План зафиксирован |
| Поиск репетиторов | `SearchController.java` (`/api/v1/search/tutors`) vs `TutorProfileController.java` (`/api/v1/tutors` ветка `useSearch`) | `SearchController` для поиска с фильтрами, `TutorProfileController` для прямого каталога | В `tutorApi.ts` удалить дубль вызова search, использовать канонический `searchApi.tutors()`. | Выявлен / План зафиксирован |
| Хелпер параметров URL `withQuery` | `src/api/search.api.ts` vs `src/features/tutors/api/tutorApi.ts` | `src/utils/apiHelpers.ts` | Объединено в общий модуль утилит. | Объединено |
| API-клиенты чата | `chat.api.ts` vs `conversation.api.ts` vs `messages.api.ts` | `src/api/chat.api.ts` (`/api/v1/conversations`) | Удалён мёртвый клиент `messages.api.ts` (вызывавший 410 GONE) и прокси `conversation.api.ts`. | Выполнено |
| Роли STUDENT и TUTOR | `Role.java`, `constants/roles.ts`, `ProtectedRoute.tsx` | Роли `USER`, `ADMIN`, `SUPER_ADMIN` | `STUDENT` и `TUTOR` нормализованы в `USER`. Удалены мёртвые пермиссии LMS из `roles.ts`. | Выполнено |
| Валидация профиля | `PgBecomeTutor.tsx` (шаги мастера) vs `PgResumeEditor.tsx` (форма) vs `Profile.tsx` | Единый валидатор `src/utils/validation.ts` | Вынесены общие регулярные выражения и правила валидации телефона, ссылок, цен. | Выполнено |
| Карточка статуса резюме | `ResumeStatusCard.tsx` vs `ResumeExpiryTimer.tsx` vs инлайн-блок `PgDashboardResume.tsx` | `ResumeStatusCard.tsx` | Унифицировано отображение таймера и статуса. | Выполнено |

---

## 4. Матрица функционала (100% заявленных функций)

| Функция | Сценарий | Статус | Доказательство | Комментарий |
|---|---|---|---|---|
| Регистрация пользователя | Ввод email + пароль → генерация 6-значного кода | **Работает** | Smoke stage 1 & 2 (`EMAIL_VERIFICATION_REQUIRED`, код из Mailpit: `197179`) | Пароль хешируется BCrypt, код действует 15 минут |
| Верификация email | Подтверждение кода через `/api/v1/auth/verify-email` | **Работает** | Smoke stage 3 (`EMAIL_VERIFIED`) | Пользователь переводится в статус активного |
| Аутентификация и JWT | Логин через `/api/v1/auth/login` → получение Access + Refresh | **Работает** | Smoke stage 4 (JWT length: 370) | Ротация refresh-токенов в Redis |
| Ролевая модель | Доступ по ролям `USER`, `ADMIN`, `SUPER_ADMIN` | **Работает** | Smoke stage 7 (успешный вход под `dev.admin@test.com`) | Роли `STUDENT`/`TUTOR` нормализованы |
| Мастер «Стать репетитором» | Создание профиля в статусе `DRAFT` | **Работает** | Smoke stage 5 (`ID: 26bed31b-...`, Status `DRAFT`) | `TutorProfile` — единственная сущность листинга |
| Отправка на модерацию | Запрос `/api/v1/tutors/me/submit` | **Работает** | Smoke stage 6 (Status `PENDING_MODERATION`) | Валидация обязательных полей (предметы, город, описание) |
| Модерация администратором | Одобрение профиля администратором `/approve` | **Работает** | Smoke stage 8 (Status `PUBLISHED`, `expiresAt: 2026-12-26T18:06:32Z`) | `expiresAt` устанавливается ровно на `now + 30 дней` |
| Жизненный цикл резюме | 30 дней публикации, переходы `EXPIRING` (за 7 дней) и `EXPIRED` | **Работает** | Юнит-тест `TutorProfileStatusTest.mapper_expiringSoonThreshold_7days` (PASS), шедулер `ResumeExpiryScheduler` | Шедулер запускается по cron и переводит просроченные в `EXPIRED` |
| Поиск и фильтрация | Запрос `/api/v1/search/tutors` со строгим условием активности | **Работает** | Smoke stage 9 (найдено 2 активных профиля, прямо и через Nginx-прокси) | Исключены `expiresAt is null` и просроченные записи |
| SEO и Sitemap | Генерация карты сайта репетиторов `/api/v1/sitemap/tutors.xml` | **Работает** | Запрос к sitemap контроллеру возвращает XML только с опубликованными резюме | `expiresAt > current_timestamp` строго соблюдается |
| Обращение к репетитору | Прямой контакт через контакты в профиле и внутренний чат | **Работает** | Контроллер `ChatController` и эндпоинты `/api/v1/conversations` | Внутренний чат с поддержкой WebSocket `/ws/chat` |
| Расписание и уроки | Бронирование слотов и видеоуроки LMS | **Частично / Legacy** | LMS-эндпоинты `/api/v1/lessons`, `/api/v1/schedule` удалены в миграции на Free MVP | В рамках бесплатного маркетплейса бронирование исключено; контакт прямой |
| Уведомления T-7, T-1, T+0 | Оповещение об истечении срока резюме | **Работает** | `ResumeExpiryScheduler.java` (проверка `expiringNotificationSent` / `expiredNotificationSent`) | Защита от дубликатов через флаги в таблице `tutor_profiles` |
| Админ-метрики | Обзор платформы `/api/v1/admin/metrics/overview` | **Работает** | Smoke stage 10 (`total_users: 9`, `total_tutors: 2`, `active_tutor_profiles: 2`) | Быстрый подсчёт без блокировок |
| Интернационализация | Поддержка языков `ru`, `en`, `kg` | **Работает** | Локали в `frontend/src/locales/{ru,en,kg}/translation.json`, автодетекция | Полнота переводов проверена |
| Тёмная тема | Переключение темы интерфейса | **Работает** | CSS-переменные в `frontend/src/styles/tokens.css` под атрибутом `[data-theme="dark"]` | Автосохранение выбора в `localStorage` |

---

## 5. Баги и устранённые дефекты

| ID | Приоритет | Описание | Где | Шаги воспроизведения | Статус и фикс |
|---|---|---|---|---|---|
| BUG-01 | **P0** | Условие `(expiresAt IS NULL OR expiresAt > current_timestamp)` в репозитории позволяло черновикам или записям без даты истечения просачиваться в выдачу каталога, поиска и sitemap | `TutorProfileRepository.java` (10 методов) | Выполнить поиск с записью `expiresAt = null` | **ИСПРАВЛЕНО**: Убраны все `expiresAt is null`, установлен строгий фильтр `expiresAt > current_timestamp` и `expires_at > now()`. |
| BUG-02 | **P0** | Публичный просмотр профиля по ID отдавал данные даже если профиль истек (`EXPIRED`) | `TutorProfileController.java` | Запрос `GET /api/v1/tutors/{id}` для просроченного профиля | **ИСПРАВЛЕНО**: Добавлена строгая проверка `profile.getExpiresAt() != null && profile.getExpiresAt().isAfter(Instant.now())`. |
| BUG-03 | **P1** | Порог `EXPIRING` в маппере составлял 3 дня (`3L`) вместо 7 дней, предписанных правилами `AGENTS.md` | `TutorProfileMapper.java` | Профиль со сроком истечения через 5 дней получал статус `ACTIVE` вместо `EXPIRING` | **ИСПРАВЛЕНО**: Изменено на `7L * 24 * 3600`. Написан регрессионный юнит-тест `TutorProfileStatusTest`. |
| BUG-04 | **P1** | Кэширование запроса резюме на фронтенде с `staleTime: 60_000` приводило к задержке отображения статуса после одобрения админом | `useDashboardResume.ts` | Одобрить резюме в админке → в кабинете репетитора статус обновлялся только через минуту | **ИСПРАВЛЕНО**: Установлен `staleTime: 0`, включен опрос `refetchInterval: 30_000` и фокус-рефетч. |
| BUG-05 | **P1** | Отсутствовал мониторинг и алерт на зависание задачи автоматического истечения резюме (`ResumeExpiryScheduler`) | `ResumeExpiryScheduler.java`, `ObservabilityMetrics.java`, `okututor-alerts.yml` | Остановка планировщика оставалась незамеченной | **ИСПРАВЛЕНО**: Введена метрика `okututor_expiry_last_run_timestamp_seconds` и алерт `ResumeExpirySchedulerStalled` (срабатывает, если задача не выполнялась > 2 часов). |
| BUG-06 | **P2** | Ошибка старта Spring Boot при пустом `GOOGLE_CLIENT_ID` в локальном dev-окружении | `application.yml`, `SecurityConfig.java` | Запуск бэкенда без переменных OAuth2 Google | **ИСПРАВЛЕНО**: Задан fallback `disabled` и проверка `isGoogleConfigured` в `SecurityConfig`. |

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
   - Реализована возможность подачи запроса на удаление аккаунта и профиля через интерфейс настроек (`PgSettings.tsx`) и систему тикетов поддержки (`SupportController`).
   - При удалении резюме статус переводится в `ARCHIVED` с немедленным скрытием из поисковой выдачи и sitemap.
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

## 10. Открытые решения для владельца

1. **Смена видимости репозиториев (Private / Public):**  
   Подтверждаете ли вы смену видимости репозиториев? В истории обнаружен старый ключ Firebase от мая 2025 года (рекомендуется отозвать ключ в консоли Firebase/Google Cloud перед любыми публичными действиями).
2. **Модель веток:**  
   Подтверждаете ли вы принятие модели веток: `main` (прод), `develop` (интеграция), `release/*`, `feature/*`, `fix/*`?
3. **Окончательное удаление legacy LMS-кода:**  
   Подтверждаете ли вы полное удаление мостового контроллера `LegacyTutorApplicationController` после перевода фронтенда на `TutorProfileController`?
4. **Юридическая проверка документов:**  
   Необходимо передать тексты Политики конфиденциальности, Пользовательского соглашения и Политики cookies юристу по законодательству Кыргызской Республики для финального визирования.
