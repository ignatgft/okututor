# Large feature workflow

## Phase 0 — Scope lock

Главный агент формулирует user outcome, non-goals, acceptance criteria, privacy/security constraints and rollback requirements. Если поведение не определено — фиксирует decision required.

## Phase 1 — Read-only research

Research/frontend/backend/database agents изучают текущие реализации и тесты. Возвращают evidence and risks. Код не меняется.

## Phase 2 — Contract-first plan

Architect согласует:
- page/route changes;
- API contract and DTO;
- DB schema/migrations;
- ownership and roles;
- query/store invalidation;
- tests and release impact.

## Phase 3 — Assign file ownership

Раздели работу на независимые пакеты. Общие DTO/router/migrations/schema назначь одному владельцу. Для параллельных редакторов используй отдельные worktrees.

## Phase 4 — Implementation

Backend и frontend выполняются параллельно только после согласования контрактов. DB changes должны быть доступны до backend integration. Frontend не должен выдумывать поля/endpoint.

## Phase 5 — Integration

Главный агент проверяет compile, DTO compatibility, error mapping, authorization, query cache, route guards and actual UI states.

## Phase 6 — Independent review

QA запускает tests and E2E. Security reviewer проверяет sensitive areas. Code reviewer читает итоговый diff независимо от автора.

## Phase 7 — Release readiness

Обновить functional map/API docs, env vars, migration/deploy steps, smoke and rollback checklist. Production deploy только после ручного разрешения.

## Stop conditions

Останови реализацию и верни на согласование, если задача требует destructive data migration, изменения auth model, breaking public API, удаления legacy data, production secret changes, irreversible deployment или неопределённой юридической/политической политики.
