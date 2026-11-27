# Repository audit baseline — `ignatgft/okututor`

**Тип аудита:** статическая проверка исходников через GitHub. Приложение и браузер не запускались, команды тестов не выполнялись.

- Repo: `ignatgft/okututor`
- Default branch при проверке: `master`
- HEAD: `54eca9583381384ba0c966fa9386c713b7ad5de4`
- Root: `.gitignore`, `README.md`, `backend/`, `docker-compose.yml`, `frontend/`.
- Recursive tree: 858 files на момент проверки, без truncation.

## Фактический стек

Frontend `frontend/package.json`: React 19, React Router 7, TypeScript 5.9, Vite 6.2, TanStack Query 5, Zustand 5, i18next; scripts `dev`, `build`, `lint` (`eslint .`), `test` (`vitest run`), `preview`. Старый документ с React 18/Router 6 устарел.

Backend `backend/pom.xml`: Java 21, Spring Boot 3.5.4, Spring Web/Security/JPA/Validation/Mail/OAuth2/Redis/Actuator, PostgreSQL, Flyway core+PostgreSQL, Micrometer Prometheus, JJWT, Springdoc, media/S3 SDK, JUnit/Testcontainers.

Flyway tree на baseline: V1–V46, последняя миграция `V46__unique_active_tutor_request.sql`. Старое описание V1–V58 не соответствует проверенному HEAD. Старые migration files не редактировать.

## Найденные расхождения (подтверждены кодом, не runtime)

| Sev | Finding | Source | Почему важно | Целевое исправление |
|---|---|---|---|---|
| P0 | Become-tutor отправляет legacy TutorApplication, а не canonical TutorProfile | `frontend/src/pages/PgBecomeTutor.tsx`, `frontend/src/api/tutors.api.ts` | Созданная анкета не является той записью, которую читает marketplace/dashboard | Перевести create/edit/submit на `tutorProfileMarketplaceApi` и `TutorProfileCreateRequest` |
| P0 | Wizard: некоторые stepContent keys не входят в STEPS; bio/languages не собираются; photo хранит лишь filename | `PgBecomeTutor.tsx` | Неполная анкета, фиктивная загрузка | Упростить до полного последовательного flow; реальный save; upload или убрать field |
| P0 | Карточка содержит hardcoded rating 4.9, 127 reviews, 5 years, 800 KGS, fake bio/education/achievements; `verified` default true | `frontend/src/features/tutors/components/TutorResumeCard.tsx` | Вводит людей в заблуждение | Удалить invented facts, показывать только API fields |
| P0 | Card URL `/repetitor/:subject/:slug` redirect-ится в `/tutors` | `TutorResumeCard.tsx`, `frontend/src/app/router/AppRouter.tsx` | Детальная страница не открывается | Использовать `/tutor/:slug` |
| P0 | Admin tutors page использует legacy Application API | `frontend/src/pages/PgAdminTutors.tsx`; canonical backend есть в `TutorModerationController.java` | Админка может модерировать не ту модель | Переподключить к `/api/v1/admin/tutors` и `TutorProfile` |
| P0 | Generic GET `/api/v1/tutor-requests` отдаёт outgoing если они есть, иначе incoming | `backend/.../request/TutorRequestController.java` | У USER с обеими функциями входящие могут пропадать | Раздельные outgoing/incoming запросы и две вкладки |
| P1 | Frontend ожидает KPI keys `total_tutors`, `total_requests`, `active_users`, backend stats возвращает `total_tutor_profiles`, `published_tutor_profiles`, `pending_tutor_profiles`, `total_tutor_requests`, `total_users` и legacy counters | `frontend/src/pages/PgAdmin.tsx`; `backend/.../admin/AdminController.java` | Неверные нули/пустые карточки | Согласовать contract, показывать реальные данные |
| P1 | Metrics page ожидает revenue/active users/course-like fields | `PgAdminMetrics.tsx` | Не соответствует бесплатному marketplace | Удалить неподдерживаемые KPI |
| P1 | Public profile загружает/отображает courses через legacy API | `TutorProfileMarketplace.tsx`, route comments в AppRouter | Смешивает LMS и marketplace, лишние запросы | Убрать из MVP после dependency check |
| P1 | Navbar scroll target `category` может не совпасть с главной секцией `subjects` | `Navbar.tsx`, `PgMain.tsx` | Кнопка категории может не прокручивать | Проверить в браузере и унифицировать ID |
| P1 | `SubjectGrid` loading state нуждается в обработке reject | `SubjectGrid.tsx` | Возможен вечный spinner | Error/retry/empty; без fake catalog |
| P1 | Admin requests page fallback-ится на generic user request API при ошибке admin endpoint | `PgAdminRequests.tsx` | Маскирует 403/500 и может показывать некорректные данные | Убрать fallback; явный error state |
| P1 | PUBLISHED TutorProfile можно обновлять без смены статуса | `TutorProfileService.update()` | Возможен обход повторной модерации | Зафиксировать policy/ADR, тестировать |
| P2 | Legacy STUDENT/TUTOR значения доступны в role dropdown | `PgAdminUsers.tsx`, `Role.java` | Новые записи могут вернуть deprecated roles | Новые назначения только USER/ADMIN/SUPER_ADMIN |
| P2 | Много legacy routes/pages по courses/lessons/schedule | `StudentRoutes.tsx`, `TutorRoutes.tsx` | Запутанная навигация/maintenance | Убрать из MVP nav; source/data удалять только после проверки |
| P2 | В root tree нет `.github/` | GitHub tree | Нет видимых CI workflows | Добавить реальные FE/BE/infra CI |
| P2 | Нет top-level monitoring config directory | Root tree | Actuator/Micrometer есть, scrape/dashboards/alerts в repo не видны | Добавить минимальный monitoring stack, если нужен deployment |
| P1 | Root Compose строит `./frontend`, но frontend Dockerfile в tree не найден | `docker-compose.yml`, `frontend/` | `docker compose up --build` вероятно не соберёт frontend | Создать/проверить Dockerfile + nginx SPA config и реально собрать |
| P1 | Local Compose содержит default DB/JWT secrets | `docker-compose.yml` | Опасно, если использовать вне локальной dev среды | Явно обозначить dev-only; production требует secrets из env |

## Канонические компоненты, уже найденные в коде

- `TutorProfile` entity/table `tutor_profiles`; `TutorProfileController` supports listing/detail/create/me/update/submit.
- `TutorModerationController` supports canonical list/detail/approve/reject/suspend/restore.
- `TutorRequestController` supports anonymous/auth request create, outgoing/incoming endpoints, mark viewed/status update, admin list.
- `TutorRequestService` validates published profile, blocked users, self-request, authenticated duplicate active requests and lifecycle transitions.
- `ChatController`/`ChatService`, frontend chat hooks and active-screen polling exist; retain only after proving request-linked flow and permissions.
- `SupportController` includes user and admin support operations.
- `Role.java` documents USER/ADMIN/SUPER_ADMIN current model and deprecated legacy roles.
- `application-prod.yml` uses env config and disables seed; production validator must be verified.
- `ObservabilityMetrics.java` has marketplace profile/search/request counters, plus old LMS counters; avoids user IDs in labels.
- `frontend/nginx.conf` provides SPA fallback, API proxy, gzip and security headers; CSP has `unsafe-inline` and `unsafe-eval`, review after verifying the actual built assets.
- `TutorProfile` entity itself has `rating=4.9` default and rating/reviews fields. Since baseline Review flow is Course-bound, ensure this value is not exposed as a genuine tutor score. Preserve schema until migrations/consumers are audited.

## Root Compose

PostgreSQL 16, backend build `./backend`, frontend build `./frontend`, ports 8080 and 5173. Нет monitoring services. Consider it local-development configuration only until Dockerfiles, health, secrets and backup/rollback are validated.

## Что требуется подтвердить локально

- JSON shape `TutorProfileMapper` vs listing/card/detail DTO fields.
- Exact frontend filters → endpoint/query → backend search behavior.
- Canonical admin list/detail response shape and actions.
- Owner phone visibility through `/tutors/me` vs hidden public response.
- Clearing optional `cityId/districtId` and relation arrays in PUT contract.
- Actual avatar/media/R2 upload and file permissions.
- Request-linked conversation ID routing.
- Support attachment ownership/MIME protections.
- Real `/api/v1/admin/metrics/**` endpoints, KPI definitions and email provider delivery.

**Ничего из этого раздела не считать runtime PASS до локального выполнения.**
