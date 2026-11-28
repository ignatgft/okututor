# MASTER TASK — довести OkuTutor до реального Marketplace MVP

> **Передай этот файл Antigravity целиком.** Это автономная многоэтапная инженерная задача. Не останавливайся на аудите, плане или генерации TODO. Управляй специализированными субагентами, исправляй код, запускай приложение, проверяй браузерные сценарии, тестируй, безопасно чисти проект и продолжай до критериев Done. Большой визуальный редизайн — только следующий отдельный этап после функциональной готовности.

## 0. Твоя роль и конечная цель

Ты — Engineering Lead, Product Architect и Release Owner OkuTutor. Отвечаешь за доказуемо рабочий результат, а не за количество написанных строк.

Продукт: бесплатный marketplace репетиторов для Кыргызстана. Ученик ищет репетитора, открывает анкету и отправляет обращение. Пользователь может также опубликовать свою анкету, пройти ручную модерацию и принимать обращения. Администратор модерирует анкеты, пользователей, обращения и поддержку.

Результат:
- реальный каталог из опубликованных анкет;
- работающий поиск/фильтры/пагинация;
- реальная детальная страница профиля;
- создание/сохранение/редактирование `TutorProfile` и отправка на модерацию;
- рабочая регистрация, подтверждение email, вход, выход, refresh, восстановление доступа;
- работающий сценарий обращения и раздельное отображение входящих/исходящих обращений;
- понятный личный кабинет `USER`;
- грамотная простая админка;
- безопасная авторизация, RBAC, защита PII, audit log;
- понятный технический мониторинг и runbooks;
- автоматические проверки, browser E2E, CI, аккуратная структура проекта и Git-процессы.

**Не превращай проект в LMS.** Курсы, уроки, расписания, бронирования, видеозвонки, платежи, подписки, комиссии, сложная аналитика обучения не входят в MVP.

## 1. Обязательные документы

Перед началом прочитай:
1. `AGENTS.md`
2. `MVP_FUNCTIONAL_CATALOG.md`
3. `PAGES_AND_ROUTES_MAP.md`
4. `PRODUCT_SCOPE_AND_DECISIONS.md`
5. `REPOSITORY_AUDIT_BASELINE.md`
6. `ADMIN_AND_MONITORING_SPEC.md`
7. `ACCEPTANCE_TEST_SCENARIOS.md`
8. `GIT_REPOSITORY_GOVERNANCE.md`
9. Все применимые `.agents/rules/*.md` и `.agents/agents/*.md`.

Старые документы не считать доказательством текущей реализации. Сначала сверить со свежим кодом и runtime.

## 2. Оркестрация субагентов — обязательна

Используй `/teamwork` для длинной многоэтапной задачи с контрольными точками. Для первоначального параллельного исследования можно использовать `/swarm`. Если установившаяся версия Antigravity предлагает иной механизм, используй доступный актуальный механизм, сохранив роли и файловое владение.

Назначь роли из `.agents/agents/`:
- Product Auditor — полный каталог страниц, компонентов, кнопок, форм, статусов и пользовательских целей.
- Frontend Specialist — маршруты, React-компоненты, формы, API integration, states, accessibility, tests.
- Backend Specialist — REST, сервисы, DTO, validation, permissions, errors, backend tests.
- Database Guardian — PostgreSQL, JPA, Flyway, constraints, indexes, data safety.
- Security Reviewer — независимый аудит RBAC, IDOR, PII, auth, secrets, upload, metrics.
- QA / Browser E2E — запуск приложения и реальные browser journeys.
- Admin & Observability Specialist — админка, KPI, audit, Actuator, Prometheus/Grafana/alerts.
- Cleanup / Architecture Reviewer — dependency graph, legacy, dead code, safe cleanup.
- Release Engineer — Docker, CI, path filters, deployment checks, runbooks.

### Правила координации
- Главный агент — единственный владелец общей архитектуры, интеграции и итоговой приёмки.
- Сначала все аудиторы работают read-only. Не разрешай конкурентные правки до инвентаризации и декомпозиции.
- Каждая подзадача содержит: цель, контекст, точные файлы/папки, критерии приёмки, тесты, зависимости и владельца.
- Один файл имеет одного активного редактора. Для параллельных правок используй отдельные worktree/branch, если механизм Antigravity позволяет.
- QA и Security проверяют интегрированный результат независимо от автора реализации.
- Не запускай много агентов на общие файлы. Задачи с `AppRouter`, API contracts, security config, `pom.xml`, миграциями и общими стилями выполняй последовательно.
- Если subagent недоступен, выполни задачу сам и обозначь ограничение.

## 3. Неизменяемые продуктовые правила

### Пользовательские роли
- `USER` — единый обычный аккаунт. Он может искать репетиторов, отправлять обращения и создать собственную анкету.
- Наличие анкеты не меняет роль пользователя.
- `ADMIN` — модерирует анкеты, пользователей, обращения и поддержку.
- `SUPER_ADMIN` — управляет повышенными административными полномочиями.
- `STUDENT`, `TUTOR`, `TEACHER` — legacy-совместимость. Новые сценарии не должны назначать их.
- Не ломай старые JWT/данные неосторожной миграцией ролей.

### Каноническая анкета
- `TutorProfile` / `tutor_profiles` — единственный источник истины для marketplace анкеты.
- У USER максимум одна анкета.
- Legacy `TutorApplication` не использовать для создания и модерации новой marketplace анкеты.
- Текущие статусы: `DRAFT`, `PENDING_MODERATION`, `PUBLISHED`, `REJECTED`, `SUSPENDED`.
- Не добавлять `EXPIRED`, `HIDDEN`, renew/boost без явного продуктового решения.
- Публично показывать только `PUBLISHED` анкеты незаблокированных пользователей.
- Телефон/email и внутренние поля модерации нельзя возвращать в публичном API.

### Правдивая информация
- MVP бесплатный; нет подписок, комиссий и платежей.
- Никаких выдуманных рейтингов, отзывов, фотографий, биографий, образования, достижений, стажа, цены, статуса verified, «активных пользователей» или дохода.
- Отсутствующую метрику скрыть или показать как недоступную. Не подменять ошибку API числом 0.
- Demo seed допустим только в dev/test и не может попасть в production.

## 4. Фаза 0 — защита рабочего состояния

До изменений:
1. Выполни `pwd`, `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`, `git log -1 --oneline`.
2. Зафиксируй branch, HEAD и наличие пользовательских изменений. Не раскрывай секреты при поиске конфигурации.
3. Создай короткую feature-ветку согласно `GIT_REPOSITORY_GOVERNANCE.md`; текущую default branch не переименовывай.
4. Не выполнять `git reset --hard`, `git clean -fd`, force push или destructive checkout.
5. Создай `docs/engineering/BASELINE.md` с версиями tools, командами запуска, профилем, status и ограничениями окружения.

## 5. Фаза 1 — полный доказательный аудит

Не ограничивайся основными страницами из старого документа.

### Frontend
- Инвентаризируй все routes, redirects, layouts, pages, guards, navigation и lazy imports.
- Проследи каждый интерактивный элемент: button, link, form, input, select, textarea, tabs, modal, dropdown, table action, mobile nav.
- Для каждой кнопки/формы найди handler → API/client → backend endpoint → DTO → persisted data → UI state.
- Проверь permissions, loading/error/success/empty, retry, duplicate submission, route destination, keyboard, mobile.
- Найди no-op handlers, `href="#"`, нерабочие ссылки, невидимые ссылки, decorative filters, fake state, fake profile fallbacks, placeholders, dead routes.
- Проверь query string, pagination, i18n ru/en/ky, Navbar/BottomNav, mobile menu, deep-link refresh.
- Измерь реальное mobile поведение на 360/390/768/1280 и desktop.

### Backend
- Инвентаризируй все controllers/mappings, DTO, validation, services, repositories, entities, security config, scheduled jobs, webhook и интеграции.
- Сопоставь каждый frontend API вызов с реально существующим endpoint и response schema.
- Проверь `@PreAuthorize`, principal checks и ownership для каждого private resource.
- Проверить ошибки 400/401/403/404/409/429/5xx, idempotency, status transitions, concurrency, pagination limits, sorting validation, cache invalidation и N+1.
- Проверить auth: register, email verify/resend, login, refresh rotation, logout, logout-all, forgot/reset password, OAuth.
- Проверить upload/media: actual MIME, size, actual file parse, URL exposure, path traversal, private object access.
- Проверить, что public Profile response не содержит phone/email/internal moderation metadata.

### Database / legacy
- Перечислить миграции и актуальную схему, entities, constraints, foreign keys, indexes, cascades и retention.
- Проследить Course/Enrollment/Booking/Lesson/Calendar/Schedule/LiveKit/старые заявки/старые роли: активное использование, совместимость или dead.
- Для каждого legacy-модуля описать доказательства: imports/routes/API/DB references/tests/external integration.
- Не редактировать ранее выпущенные Flyway migrations. Не удалять данные в рамках обычного cleanup.

### Runtime audit — обязателен
1. Подготовить dev/test environment на основе `.env.example`, без production secrets.
2. Поднять отдельную disposable PostgreSQL database; Redis только если фактически нужен для проверяемого сценария.
3. Прогнать всю Flyway chain на тестовой БД.
4. Запустить backend и проверить health/readiness.
5. Запустить frontend и открыть его в реальном браузере.
6. Проверить API основного пути и все основные страницы.
7. Пройти browser сценарии под Guest, USER, owner, non-owner USER, ADMIN и SUPER_ADMIN.
8. Проверить console, network tab, HTTP statuses, UI states и responsive.
9. Если Docker/browser/network/tooling недоступны — `BLOCKED` с причиной и доказательством. Не выдавать PASS.

### Статусы фактов
Каждую функцию помечать:
- `CONFIRMED_RUNTIME` — реально проверена запущенным приложением/тестом.
- `CONFIRMED_CODE` — подтверждена исходником, runtime не проверен.
- `PARTIAL` — часть сценария работает.
- `BROKEN` — дефект воспроизведён либо контракт явно несовместим.
- `LEGACY` — старый путь, не используемый новым marketplace flow.
- `UNVERIFIED` — нет доказательств или среда блокирует проверку.

На каждый finding: path+symbol/route, expected, actual, reproduction, P0/P1/P2/P3, fix, test ID. Результат — `docs/engineering/REPOSITORY_AUDIT.md`, обновлённая функциональная карта и план с dependencies/file ownership. Не начинать массовую реализацию без этого плана.

## 6. Фаза 2 — зафиксировать MVP scope

Используй `MVP_FUNCTIONAL_CATALOG.md` как целевую спецификацию. Если реальная реализация расходится, исправь код минимально или зафиксируй обоснованное решение в ADR. Не расширяй продукт.

В MVP: главная, каталог/поиск/фильтры, публичный профиль, auth, одна анкета на USER, draft/save/edit/submit/moderation/publish/reject/suspend/restore, запрос/обращение, входящие/исходящие, чат только если он request-linked и проходит E2E, user dashboard/profile/settings, admin users/tutor moderation/requests/support, SEO essentials, health/logs/metrics/backups/runbooks.

Вне scope: courses, paid offers, subscriptions, payments, scheduling, recurring lessons, bookings, attendance, homework, video rooms, tutor reviews/ratings без реальной доказуемой модели.

## 7. Фаза 3 — обязательные исправления P0/P1

### P0-1. Wizard создания анкеты — только TutorProfile

На baseline `PgBecomeTutor` использует legacy `tutorsApi.submitApplication()`, не канонический `TutorProfile`. В наборе шагов есть несогласованность: некоторые `stepContent` не входят в `STEPS`; bio/languages фактически недоступны; фото хранит только filename. Исправить полностью:

1. Гость получает login/register и после авторизации возвращается к созданию анкеты.
2. Получить subjects/levels/cities/districts из реального reference API.
3. Для новой анкеты вызвать `POST /api/v1/tutors` и создать `DRAFT`; для существующей — загрузить `/api/v1/tutors/me` и редактировать через `PUT /api/v1/tutors/me`.
4. Автосохранять каждую завершённую логическую часть через API; refresh не должен терять уже сохранённый draft.
5. Использовать UUID subjectIds/levelIds/cityId/districtId, не подписи UI.
6. Поля сверить с фактическим `TutorProfileCreateRequest`: firstName, lastName, title, shortDescription, about, tutorType, education, university, educationDetails, experienceYears, priceFrom/priceTo, currency KGS, online/offline, cityId, districtId, phone, subjectIds, levelIds, languages.
7. Photo control: подключить реальную безопасную загрузку и URL/media object или убрать из MVP. Имя файла не является upload.
8. Сделать компактный полный wizard: основная информация → предметы/уровни → образование/опыт → формат/локация/стоимость → preview → save draft/submit.
9. Клиентская и серверная валидация совпадают; ошибки по полю; не терять введённые значения; блокировать повторный submit.
10. Submit — только `POST /api/v1/tutors/me/submit`; проверить backend status `PENDING_MODERATION`.
11. Инвалидировать query cache, dashboard показывает реальное состояние.
12. Rejected profile можно исправить и повторно отправить; существующую анкету нельзя случайно создать повторно.

### P0-2. Реальные карточки и профиль

На baseline `TutorResumeCard.tsx` содержит fake fallback: 4.9 rating, 127 reviews, 5 years experience, 800 KGS, искусственные bio/education/achievements и `verified=true` по умолчанию. Удалить.

- Не отображать TutorProfile rating/reviews: существующий Review API относится к Course/Booking, а не реальному TutorProfile.
- Verified badge показывать только при существующей проверяемой модели верификации; иначе убрать.
- Показывать только данные canonical TutorProfile DTO. Не превращать relation object/array в `[object Object]`.
- Карточка должна вести на `/tutor/:slug`, а не legacy `/repetitor/:subject/:slug`, который сейчас redirect в каталог.
- Удалить course API calls и course section из marketplace public profile, если это deprecated; backend legacy не удалять до dependency audit.
- Пустые данные скрывать, не заменять выдуманными значениями.

### P0-3. Админская модерация должна работать с TutorProfile

На baseline `PgAdminTutors.tsx` ходит в legacy TutorApplication API, хотя `TutorModerationController` обслуживает canonical `/api/v1/admin/tutors` и `/api/v1/admin/tutor-profiles`.

- Переподключить `/admin/tutors` к canonical Profile endpoints.
- Default filter — `PENDING_MODERATION`; tabs: PENDING_MODERATION/PUBLISHED/REJECTED/SUSPENDED; DRAFT по необходимости.
- List + pagination + detail должен показывать actual TutorProfile data; контакты — только администратору.
- Actions: approve; reject с обязательной причиной; suspend с причиной; restore. Каждое действие — permission, loading/disabled, confirm где нужно, error/success, re-fetch.
- Использовать фактические `ModerationAction` и audit log, если сервис их пишет. Не показывать legacy status tabs как новые.
- Проверить, что пользователь не может вызвать admin action напрямую.

### P0-4. Входящие и исходящие обращения — две независимые выборки

На baseline `GET /api/v1/tutor-requests` отдаёт outgoing, если они есть, и только иначе incoming. Это скрывает входящие, если USER одновременно размещает профиль и обращается к другим преподавателям.

- Frontend вызывает отдельные endpoints: `/api/v1/tutor-requests/me` — исходящие, `/api/v1/tutors/me/requests` или подтверждённый incoming alias — входящие.
- В UI две явные вкладки «Полученные» и «Отправленные»; данные не взаимозаменяются.
- Показать direction, profile/second party, createdAt, message, status, допустимые действия.
- Статусы только из реальных `TutorRequest.Status`; разрешённые переходы проверять в backend service.
- Student может закрывать только собственную заявку; tutor может обрабатывать только входящую к своему профилю.
- Не показывать телефон/контакт публично; request/contact доступны только участникам и authorized admin.
- Generic endpoint исправлять только если он нужен; не выдавать объединённые страницы без direction.

### P0-5. Один понятный contact flow

Не оставлять два конкурирующих CTA с разными последствиями. Для MVP единое основное действие «Связаться»/«Оставить заявку» открывает форму:

1. Имя, контакт (телефон/мессенджер), необязательное короткое сообщение.
2. `POST /api/v1/tutor-requests` с `tutorProfileId`, `studentName`, `studentContact`, `message`.
3. Guest flow разрешён только после проверки rate limiting и privacy; backend уже принимает optional principal. Гость получает подтверждение и не должен видеть обещание личного чата/inbox.
4. Authenticated USER видит outgoing request; profile owner — incoming.
5. Если request-linked conversation реально поддерживается и E2E проходит, создать/получить conversation после request. Если chat creation fails, сохранённый request остаётся success; сообщить отдельно, что чат пока недоступен.
6. Не навигировать в `:requestId`, если route/component ожидает conversationId, пока это разрешение не проверено.
7. Backend предотвращает self-request и duplicate active authenticated request; guest spam ограничен rate-limit.

Предпочтительная модель MVP — TutorRequest как первичная сущность контакта. Прямой чат без заявки оставлять только после ADR и теста прав/антиспама.

### P0-6. Admin dashboard и реальные KPI

На baseline frontend ожидает `total_tutors`, `total_requests`, `active_users`; Admin stats API возвращает поля типа `total_tutor_profiles`, `pending_tutor_profiles`, `published_tutor_profiles`, `total_tutor_requests`, `total_users` плюс legacy course counters.

- Согласовать точный response contract и UI mapping.
- Разрешённые KPI: total users, published profiles, pending moderation, total/new requests, unresolved support tickets — только если есть точный API.
- Убрать revenue, lessons, bookings, active users 24h, fake reviews, если backend реально это не измеряет.
- API error/missing value не превращать в 0.

### P1 — другие дефекты для исправления

- Проверить Navbar section scroll: target `category` может не совпасть с section id `subjects` в PgMain.
- SubjectGrid: обработать API reject, retry/empty; не оставлять вечный loading и не подменять справочник случайным списком.
- Проверить все фильтры: UI → URL → API query → backend filter → результат; проверить reset/pagination.
- Проверить canonical `/tutor/:slug` со всех карточек/результатов.
- Проверить auth return intent: после входа вернуть к нужной анкете/действию один раз, без повторной отправки.
- Проверить support routes, API, roles, attachments; убрать неподдерживаемые controls.
- Все формы: labels, required, max length, server validation, field error, disabled while pending, success state.
- Все `Link`, `navigate`, BottomNav entries должны вести на работающие canonical routes.
- Проверить refresh token, logout, expired-session handling, no refresh loops.
- `PgAdminRequests.tsx` не должен fallback на generic USER endpoint при отказе admin API; ошибка должна быть видимой.
- Проверить `PgAdminMetrics.tsx` и remove unsupported metrics.

## 8. Фаза 4 — понятная админка

Минимальные разделы:
1. Обзор — только реальные marketplace KPI.
2. Анкеты — очередь модерации, просмотр, approve/reject/suspend/restore.
3. Пользователи — поиск, блокировка/разблокировка; role changes только SUPER_ADMIN.
4. Обращения — список, статусы, abuse handling; никаких fallback на USER endpoint.
5. Поддержка — тикеты, назначение, ответ, priority/status, close/reopen.
6. Техническое состояние — ссылка на защищённый Grafana/health view, не фальшивые KPI в админке.

Каждое действие должно иметь backend permission, loading/error/success, confirm при рискованном изменении и audit event. Убрать из основной навигации функции вне MVP. Legacy data/code сохранять до отдельной оценки.

## 9. Фаза 5 — безопасность

- IDOR: A не может читать/редактировать профиль, заявки, чат, тикет, файлы и настройки B.
- RBAC проверяется backend: USER не вызывает admin; ADMIN не меняет SUPER_ADMIN; SUPER_ADMIN-only actions защищены.
- Public profile response не содержит phone/email, internal moderation notes, auth fields.
- Admin видит только нужную PII и действия аудируются.
- Rate-limit register/login/verify/reset/request/message/upload; проверить доверие к forwarded IP.
- Production не стартует с dev JWT, default DB password, placeholder OAuth, включённым demo seed.
- Не коммитить `.env`, токены, R2/OAuth/Telegram secrets.
- Logs не содержат auth headers/cookies/password/code/token/phone/contact body.
- File upload: размер, MIME, actual file format, image bomb, traversal, private object access.
- Проверить CORS, CSP, cookie flags, refresh rotation, CSRF risks.
- Actuator/Prometheus только internal/protected.
- XSS testing для bio, request text, chat and support messages.
- Выполнить dependency/security scan и исправить high/critical findings. Не обещать «100% secure».

## 10. Фаза 6 — минимальный мониторинг

Сначала изучить существующий Actuator/Micrometer, counters, logging, production profile.

Минимум:
- liveness/readiness/health;
- private Prometheus scrape `/actuator/prometheus`;
- один Grafana dashboard: uptime, request rate, p95/p99, 4xx/5xx, JVM heap/GC, Hikari, DB status, Flyway status;
- бизнес-счётчики: profile created/published, search/no-results, requests created, moderation approve/reject, auth failures/rate-limit — только если счётчик реально incremented;
- Alertmanager: backend down, scrape down, 5xx spike, latency regression, DB unavailable, disk/heap high;
- Telegram alerting только при наличии настоящего secret. Не придумывать credentials.
- Loki/Promtail только если есть реальная потребность, retention и PII masking. Не добавлять сервисы ради количества.
- Runbook: health, logs, restart, DB, backup/restore, alert response.

Мониторинг должен разворачиваться независимо. CI/deploy monitoring должен запускаться только при изменении monitoring/infrastructure paths.

## 11. Фаза 7 — структура и безопасная чистка

Сохрани текущие корни `backend/`, `frontend/`, `docker-compose.yml`. Документы — `docs/product`, `docs/engineering`, `docs/qa`, `docs/runbooks`; agent rules — `.agents/rules`, agents — `.agents/agents`; CI — `.github/workflows`; инфраструктура — только реальные deploy configs.

Не перемещай `src` ради эстетики. Перед удалением файла проверь обычные и dynamic imports, lazy routes, tests, styles/assets, translations, build config, API routes, data migrations, external clients. Удалять только proven dead code, отдельными логическими коммитами и после тестов.

Старые Flyway migrations не удалять/не изменять. Не удалять legacy modules или data без backward-compatible migration, backup/rollback и отдельного approval. Сначала скрыть от MVP navigation/deprecate, затем оценить usage.

## 12. Фаза 8 — GitHub и CI/CD

- На baseline default branch `master`; не переименовывать.
- Короткие feature/fix/chore ветки. Не делать постоянные ветки `frontend-prod/backend-prod/monitoring-prod`.
- GitHub Actions: backend tests, frontend lint/test/build, migration validation, dependency/security scan, E2E gate.
- Path filters: frontend changes → frontend CI; backend changes → backend CI; monitoring paths → monitoring validation; common API contract changes → оба FE+BE workflows.
- PR содержит summary, scope, API/DB impact, security/PII, tests, screenshots, rollback notes.
- Conventional commits, маленькие логические изменения. Не коммитить secrets, `.env`, build artifacts, node_modules, target/dist, dumps, logs.
- Никаких force-push, отключения тестов, самовольного merge или production deployment.
- CI должен сохранять required gate при path filtering; не создавать ситуацию, когда required check пропускается.

## 13. Фаза 9 — тесты и stop gates

См. `ACCEPTANCE_TEST_SCENARIOS.md`.

Backend:
- unit: status transitions, ownership, moderation, idempotency, validation;
- integration PostgreSQL/Testcontainers: main APIs + Flyway;
- security: guest/user/owner/non-owner/admin/superadmin;
- API contract and no PII leaks.

Frontend:
- Vitest + RTL forms, validation, empty/error/loading, auth gates, filters, status controls;
- API hooks, cache invalidation and mutation error;
- accessibility smoke.

E2E:
- Playwright или существующий проверенный браузерный stack. Не говорить «проверил браузер», если его не запускал.
- Desktop/mobile; isolated synthetic fixtures and DB only.

Commands to verify (don't assume wrapper/tool availability):
- `cd backend && ./mvnw verify` if wrapper exists, otherwise `mvn verify`;
- `cd frontend && npm ci && npm run lint && npm run test && npm run build`;
- `docker compose config`, build each image, then disposable `docker compose up --build`;
- smoke: health, auth, listing, profile, request, moderation.

Do not proceed past a gate if P0 unresolved, builds fail, E2E main flow failed/unverified, security audit incomplete or DB migration risk unclear. If environment blocks a check, status BLOCKED and evidence.

## 14. Фаза 10 — дизайн только после функциональной готовности

Не делай большой визуальный редизайн сейчас. Разрешены только UX changes needed for real forms, error feedback and accessibility.

Когда все функциональные gates green:
- Создай `docs/product/DESIGN_POLISH_BACKLOG.md`.
- Зафиксируй экраны, проблемы, rationale, responsive states.
- Сохрани existing design tokens/system; не создавай вторую дизайн-систему.
- Подготовь отдельную фазу UI polish и visual regression tests.

## 15. Автономность и неопределённость

- Не спрашивай подтверждение для обычных инженерных решений внутри согласованного MVP.
- При неоднозначности выбирай минимальный безопасный вариант и записывай ADR.
- Если затрагиваются product scope, retention/PII, production schema, secrets, billing/deploy или destructive data changes — не угадывай; зафиксируй блокер и безопасный fallback.
- Не останавливайся после аудита, плана, TODO или добавления документации. Выполняй исправления до Done.
- Не подменяй production API mocks. Моки разрешены только в tests.
- Не скрывай проблемы silent catch, не отключай линтер/тесты ради зелёного CI.

## 16. Финальные deliverables

Обновить/создать:
- `docs/engineering/REPOSITORY_AUDIT.md`
- актуальный `MVP_FUNCTIONAL_CATALOG.md`
- актуальный `PAGES_AND_ROUTES_MAP.md`
- `docs/engineering/API_CONTRACTS.md`
- `docs/engineering/ARCHITECTURE.md`
- `docs/engineering/decisions/ADR-*.md`
- `docs/qa/TEST_REPORT.md`
- `docs/qa/PLAYWRIGHT_SCENARIOS.md`
- `docs/runbooks/PRODUCTION_RUNBOOK.md`
- `docs/product/DESIGN_POLISH_BACKLOG.md` (после функционального MVP)
- `.github/workflows/*` реально запускаемые CI workflows
- changelog/release notes по фазам.

Финальный отчёт: реально работающие сценарии, конкретные fixes/files, API/DB changes, migration impact, legacy left+why, exact test commands/results (`PASSED/FAILED/BLOCKED/NOT RUN`), security findings, residual risks, required owner secrets/config, commit SHA и PR URL если созданы.

**Запрещено объявлять MVP готовым при unresolved P0, fake public data, no-op buttons, нерабочей модерации, пропадающих incoming requests, exposed PII или ложных test reports.**
