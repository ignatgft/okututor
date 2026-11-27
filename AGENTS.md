# OkuTutor — правила для AI-агентов (Free MVP)

Единый источник правил. Обновляй при каждом значимом изменении. Все изменения должны соответствовать принципам Free MVP: просто, быстро, бесплатно, без платной логики.

## 1. Контекст проекта
OkuTutor — бесплатный маркетплейс репетиторов и педагогов в Кыргызстане (Бишкек, Ош и др.), узкая специализация — образование. Не полноценная LMS.
Основной поток: найти репетитора → связаться (чат / заявка) → согласовать расписание → урок. Платежей в MVP нет.

Стек:
- Backend: Java 21, Spring Boot 3.5.4, PostgreSQL 16/18 (Neon в проде), Flyway, JPA/Hibernate, Redis, JWT, Spring Security, хранилище файлов local / R2.
- Frontend: Vite, React, TypeScript, TanStack Query, Zustand, React Router, i18next (ru основной, en, ky), токены в tokens.css, тема через [data-theme="dark"].
- Деплой и локально: Docker Compose (postgres, redis, mailpit, backend 8080, frontend 5173/8081, мониторинг).

Роли: USER (по умолчанию, может иметь резюме), ADMIN, SUPER_ADMIN. Легаси STUDENT и TUTOR отображаются в USER.

## 2. Домен резюме (единственный источник истины)
Сущность: backend/src/main/java/com/okututor/backend/tutor/TutorProfile.java (таблица tutor_profiles).
- Не создавай сущность Resume. TutorProfile и есть резюме/листинг.
- Профиль пользователя постоянный; резюме (листинг) временное, связано через user_id (unique).

Статусы TutorProfileStatus: DRAFT, PENDING_MODERATION, PUBLISHED (= ACTIVE), REJECTED, SUSPENDED, EXPIRED, HIDDEN.
- ACTIVE — не отдельное значение в БД: PUBLISHED и expiresAt > now.
- EXPIRING — вычисляется: 0 < expiresAt − now ≤ 7 дней, в БД не хранится.

Поля (перед добавлением проверь существующие): status, publishedAt, expiresAt (publishedAt + 30 дней), lastActiveAt, hiddenAt (опц.), archivedAt (опц.), createdAt, updatedAt, viewsCount, rejectionReason, rating, seoTitle.

Жизненный цикл:
```
DRAFT --submit--> PENDING_MODERATION --approve--> PUBLISHED (expiresAt = now+30д)
PUBLISHED --(expiresAt - 7д)--> EXPIRING (вычисляемо) --(expiresAt <= now)--> EXPIRED
EXPIRED --renew--> PUBLISHED (expiresAt = max(now, expiresAt)+30д, publishedAt = now)
PUBLISHED --hide--> HIDDEN --restore--> PUBLISHED (если не истёк) или DRAFT
PUBLISHED --admin suspend--> SUSPENDED
```
Правила поиска: резюме видно в поиске только если status = PUBLISHED, expiresAt > now, user не заблокирован, noindex = false.
Фильтр expiresAt > now обязателен в КАЖДОМ запросе поиска: publicListing, searchCandidates, findPublishedWithFilters, findPublishedExcludingBlocked, search/api, autocomplete, SEO-листинг, sitemap.
Индекс (status, expires_at).

Продление: publishedAt = now, expiresAt = max(now, expiresAt) + 30 дней, lastActiveAt = now. Не «стекать» дни без ограничения (1 клик = +30 дней).

Бэкенд сам вычисляет даты и статусы. Фронтенд никогда не является доверенным источником expiresAt и status.

Автоистечение:
- Основной способ — фильтр expiresAt > now (не полагаться только на cron).
- Дополнительно: задача раз в час, идемпотентно: UPDATE tutor_profiles SET status='EXPIRED' WHERE status='PUBLISHED' AND expires_at <= now. Без удалений.

Уведомления (NotificationService): T-7 дней, T-1 день, T+0 (скрыто из поиска). Идемпотентно: entityType=RESUME, entityId=profileId, без дублей.

SEO: профиль пользователя всегда 200. Страница резюме (/tutor/{slug}) при EXPIRED/HIDDEN — 200 с текстом «Временно недоступно», meta robots noindex, исключена из sitemap. Массовых 404 не допускать.

Админ: метрики active, expiring, expired, hidden, archived; действия view, hide, restore, renew, extend; история через ModerationAction и AuditLogService.

Безопасность: только владелец публикует, редактирует, скрывает, продлевает, восстанавливает; админ модерирует всех. Проверка principal.id() против profile.user.id. Rate limit на создание и отправку. Один профиль на пользователя (existsByUserId). Админ-методы: @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')").

## 3. Миграции БД
Проверь db/migration V40–V47+ перед созданием новой. Новая миграция V48__resume_expiry.sql: expires_at, last_active_at, hidden_at (timestamptz) + индекс (status, expires_at), backfill для PUBLISHED. Для прода — NOT NULL только после backfill.

## 4. Фронтенд
Не создавай параллельный workflow. Интеграция в существующее: PgBecomeTutor.tsx (мастер 10 шагов), PgTutorDashboard.tsx, PgDashboardResume.tsx, PgTutorProfile.tsx, PgSearch.tsx, хук useDashboardResume (staleTime 0).
Единый компонент ResumeStatusCard: «Активно до {дата}» / «Скоро истекает (7 дн.)» / «Истекло» + кнопки Редактировать / Скрыть / Продлить (30 дн.).
API: POST /tutors/me/submit, /renew, /hide, /restore (или в стиле PUT /tutors/me, если новых эндпоинтов не нужно).

## 5. Ветки и релизы
- main — продакшен, защищена.
- develop — интеграция.
- release/backend, release/frontend — релизные ветки по репозиториям.
- feature/*, fix/*, audit/* — рабочие.
- Коммиты: Conventional Commits (feat:, fix:, refactor:, docs:, test:, chore:).
- Без force-push в main и develop. Удаление веток и смена видимости репозитория — только с подтверждением владельца.
- Перед публикацией репозитория — проверка истории на секреты; при находке — ротация.

## 6. Docker и локальный запуск
Сервисы: postgres, redis, mailpit, backend, frontend, prometheus, grafana. Healthcheck у каждого. Конфигурация через .env (шаблон .env.example без секретов).
Проверка перед сдачей: docker compose up -d → миграции без ошибок → фронт открыт → API отвечает → smoke-сценарий работает.

## 7. Мониторинг
Spring Boot Actuator + Micrometer → Prometheus. Grafana-дашборд: RPS, latency, 5xx, JVM, БД, Redis, число опубликованных и истекающих резюме, статус задачи истечения. Алерты: рост 5xx, падение health, задача истечения не отработала 2 часа. Логи в JSON, без персональных данных.

## 8. Персональные данные и законодательство
См. docs/LEGAL_COMPLIANCE.md. Минимум: политика конфиденциальности, политика cookies, пользовательское соглашение, согласие при регистрации, право на изменение и удаление данных. Учитывать данные несовершеннолетних. Тексты политик помечать «черновик, требует проверки юристом».

## 9. Что НЕ делать (Free MVP)
- Premium / VIP / платные поднятия / подписки / тарифы.
- Обязательные сложные рейтинги и календари доступности.
- Удаление старых резюме.
- Ограничение на количество бесплатных продлений.
- Дубли сущностей, сервисов, компонентов.
- Хранение секретов в репозитории.

## 10. Рабочий процесс агента
1. Аудит (модули, файлы, дубли, легаси).
2. План (сверка с этим файлом, без дублей).
3. Бэкенд: миграция, сущность, фильтр поиска, задача, API.
4. Фронтенд: ResumeStatusCard, дашборд, профиль, поиск.
5. Уведомления (T-7, T-1, T+0, идемпотентно).
6. Админка (метрики и действия).
7. Тесты: mvn clean verify, npm run build, e2e, k6, проверка SEO.
8. Проверка, что существующий функционал не регрессировал.
9. Обновление документации и AGENTS.md.

## 11. Карта файлов
- Backend: tutor/TutorProfile*, search/*, legal/*, notification/*, admin/*.
- Frontend: pages/PgTutorDashboard, PgDashboardResume, PgBecomeTutor, features/tutors/*, api/marketplace/tutorProfileMarketplace.api.ts.
- Миграции: db/migration/V48__*.
- Тесты: src/test/java/..., src/test/k6/api-test.js.

При сомнениях выбирай простое решение: фильтр expiresAt > now важнее логики по одному статусу.
