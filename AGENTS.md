# Постоянные правила AI-агентов OkuTutor

## Продуктовый контракт
OkuTutor — бесплатный marketplace репетиторов для Кыргызстана, не LMS. Обычный аккаунт `USER` может искать репетиторов и создать одну анкету `TutorProfile`. Роль аккаунта не меняется из-за наличия анкеты. `ADMIN` модерирует и поддерживает порядок; `SUPER_ADMIN` управляет повышенными административными правами.

Перед работой прочитать `MASTER_EXECUTION_TASK.md`, `MVP_FUNCTIONAL_CATALOG.md`, `PRODUCT_SCOPE_AND_DECISIONS.md`, `REPOSITORY_AUDIT_BASELINE.md` и применимые `.agents/rules/*.md`.

## Источник истины
1. Текущий код, миграции, тесты и runtime — факты о реализации.
2. `MVP_FUNCTIONAL_CATALOG.md` — целевое поведение после исправления.
3. `REPOSITORY_AUDIT_BASELINE.md` — baseline на указанном commit, его нужно обновить после локального аудита.
4. Комментарии, TODO, старые документы и наличие компонента не доказывают, что функция работает.

## Архитектура
- `TutorProfile` / `tutor_profiles` — каноническая анкета. Не создавать новую сущность Resume и не использовать legacy `TutorApplication` для marketplace flow.
- Новая бизнес-логика использует `USER`, `ADMIN`, `SUPER_ADMIN`. `STUDENT`, `TUTOR`, `TEACHER` — только legacy compatibility.
- На baseline frontend: React 19, TypeScript, Vite 6, React Router 7, TanStack Query 5, Zustand, i18next. Проверять фактические package/lockfile перед изменениями.
- На baseline backend: Java 21, Spring Boot 3.5.4, PostgreSQL, Flyway, Spring Security, JPA, Micrometer/Actuator.
- Не добавлять курсы, уроки, бронирования, расписание, платежи, подписки и видеозвонки в MVP без отдельного решения.

## Инженерные правила
- Перед изменениями: `git status`, branch, last commit. Не удалять и не перезаписывать пользовательскую работу.
- Не редактировать один файл параллельно разными агентами. Каждой подзадаче назначать файлового владельца.
- Перед изменением API согласовать DTO, HTTP status, validation, permissions и frontend contract.
- Не изменять старые Flyway migrations. Новая схема — только новая миграция после проверки совместимости.
- Не использовать fake API responses, hardcoded business data, `catch {}` без осмысленной обработки, выдуманные ratings/education/experience/prices/achievements.
- Не логировать пароли, JWT, refresh tokens, cookies, verification codes, телефоны, контакты, тексты обращений и приватные сообщения.
- Не открывать Actuator/Prometheus, admin APIs или PII публично.
- Не выполнять production migration, destructive SQL, массовое удаление, force-push или production deployment без разрешения владельца.

## Проверки
- Отчёт о тестах содержит команду, фактический exit code и статус `PASSED`, `FAILED`, `BLOCKED`, `NOT RUN`.
- UI-кнопка считается готовой только при реальном действии, permissions, loading/error/success state и тесте.
- В финале перечислить изменённые файлы, поведение, API/DB, тесты, ограничения и риски.
