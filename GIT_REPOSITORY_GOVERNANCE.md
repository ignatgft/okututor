# Git, repository structure and collaboration policy

## Branch model

На baseline default branch — `master`. Не переименовывать её без явного решения владельца.

- `master` — защищённая integration/release branch.
- `feature/<scope>` — новая функциональность.
- `fix/<scope>` — исправления.
- `chore/<scope>` — CI, документация, cleanup.
- `hotfix/<scope>` — срочные production fixes.

Не создавать постоянные `frontend-prod`, `backend-prod`, `monitoring-prod`. Независимые деплои настраиваются через path filters и отдельные deploy targets, а не отдельные постоянно живущие ветки.

## Safe start

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
git log -1 --oneline
```

Если есть изменения, определить владельца и не трогать без согласования. Не использовать `git reset --hard`, `git clean -fd`, destructive checkout, force push.

## Parallel agent work

- Каждой задаче назначить владельца файлов/папок.
- Если Antigravity поддерживает isolated worktree/branch, использовать их для независимых задач.
- Один файл не редактировать параллельно несколькими агентами.
- Сначала read-only audit всеми агентами, затем согласованный план, затем параллельная реализация непересекающихся частей.
- `AppRouter.tsx`, API contracts, `pom.xml`, security config, Flyway migrations и глобальные styles — только один активный редактор за раз.
- Интеграция и полные проверки — ответственность главного агента.

## Commit convention

Примеры:
- `fix(frontend): submit canonical tutor profile from wizard`
- `fix(api): expose incoming and outgoing requests separately`
- `fix(admin): moderate tutor profiles instead of legacy applications`
- `test(e2e): cover tutor request lifecycle`
- `chore(ci): add independent frontend and backend checks`

Коммит — одна логическая правка с соответствующими тестами. Не коммитить `.env`, secrets, `node_modules`, `dist`, `target`, database dumps, logs, личные данные и screenshots с PII.

## Pull request checklist

- Summary and motivation.
- Pages/roles/flows affected.
- API contract changes.
- Database migration + backward compatibility + rollback.
- Security/PII impact.
- Commands/tests and actual results.
- UI screenshots/mobile screenshots.
- Deployment impact.
- Known limitations and rollback notes.

Не отключать required checks для зелёного CI. Не force-push в protected branch. Не merge PR с failing required checks.

## CI path strategy

Создать workflows в `.github/workflows/` после проверки фактических команд и environment:
- `frontend-ci.yml`: `frontend/**`, shared frontend contracts and workflow itself.
- `backend-ci.yml`: `backend/**`, shared API contract files and workflow itself.
- `repository-ci.yml`: root Compose, shared docs/rules, workflow files.
- `monitoring-ci.yml`: `monitoring/**` или `infrastructure/monitoring/**`, только если файлы реально существуют.
- `e2e.yml`: main cross-stack changes and manual dispatch.

Изменение shared API contract запускает и frontend, и backend checks. Не делать path filters, которые пропускают required status check на PR. Секреты только в GitHub Environment/Repository secrets, не в YAML.

## Target repo structure

```text
okututor/
├── AGENTS.md
├── MASTER_EXECUTION_TASK.md
├── MVP_FUNCTIONAL_CATALOG.md
├── PAGES_AND_ROUTES_MAP.md
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/... + src/test/...
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile          # добавить/проверить; root compose сейчас требует его
│   ├── nginx.conf
│   └── src/...
├── docs/
│   ├── product/
│   ├── engineering/decisions/
│   ├── api/
│   ├── qa/
│   └── runbooks/
├── .agents/rules/
├── .agents/agents/
├── .github/workflows/
├── infrastructure/        # только реальные deployment files
└── docker-compose.yml      # local development, не автоматически production
```

Сохранять существующие `backend/` и `frontend/` source trees. Не перемещать компоненты ради формальной структуры.

## Safe cleanup checklist

До удаления любого файла проверить:
1. Static imports, lazy/dynamic imports, routes, tests.
2. Styles, assets, translation keys and build chunk config.
3. API endpoints and external clients/webhooks/scheduled jobs.
4. DB entities, migrations, production data and user-created records.
5. SEO aliases, sitemap/canonical URLs and deep links.
6. Add redirect/compatibility/tests where needed.
7. Delete in an isolated commit only after regression checks.

Предпочтительный процесс: `deprecate → remove from user navigation/new writes → observe → data/backup/rollback plan → delete`.

## Independent deploys from monorepo

- Frontend trigger: `frontend/**` + shared contract changes affecting frontend.
- Backend trigger: `backend/**` + shared API/DB contract changes.
- Monitoring trigger: monitoring/infrastructure path only.
- Backend API changes must be additive-compatible first; frontend can deploy independently; remove deprecated API after compatibility window.
- Verify Docker build contexts. At baseline `docker-compose.yml` builds `./frontend`, но `frontend/Dockerfile` не найден.
- Do not deploy production or mutate production data without explicit approval.
