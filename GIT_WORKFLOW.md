# Git и параллельная работа в monorepo

## Модель веток

Не создавать постоянные production-ветки отдельно для frontend/backend/monitoring. Компоненты разделяются CI/CD path filters, build contexts и Dokploy/Cloudflare applications, а не отдельными ветками.

Рекомендуемая схема:
- `main` — production, защищённая ветка;
- `develop` — интеграционная ветка, только если команда действительно использует промежуточное окружение;
- `feature/<scope>-<short-name>` — задача;
- `fix/<scope>-<short-name>` — исправление;
- `hotfix/<scope>-<short-name>` — критический production fix.

Если работа ведётся одним разработчиком и `develop` не нужен, оставь `main` + короткоживущие feature branches. Не добавляй процесс ради процесса.

## Параллельные агенты

- Два агента не редактируют один файл одновременно.
- До запуска параллельной разработки согласуй общие API/DTO/DB-контракты.
- Разделяй работу по каталогам/пакетам: `frontend/**`, `backend/**`, `infrastructure/**`, `docs/**`.
- Для независимых изменений используй отдельные ветки/worktree.
- Общие файлы (`package.json`, root compose, API DTO, shared types, migrations, router) назначай одному владельцу.
- Агент не должен выполнять merge чужой ветки без проверки.

## PR и интеграция

Перед PR:
1. `git status` и diff;
2. lint/build/test затронутого приложения;
3. проверки интеграционного контракта;
4. проверка секретов и случайных файлов;
5. описание миграций, env vars и deployment impact.

Merge в `main` только после успешных required checks и ручного подтверждения владельца. Автоматический production deploy разрешать только после настройки secrets, environment protection, rollback и health checks.

## Независимые deploy targets

- Frontend: отдельный build/deploy target из `frontend/` (Cloudflare Pages или выбранный провайдер).
- Backend: отдельный Docker build context `backend/` и отдельное приложение Dokploy.
- Monitoring: отдельный deployment target только после фактической проверки конфигурации мониторинга.

Workflow должен учитывать изменения внутри своей папки и все shared files, влияющие на сборку/контракт. Изменения только документации не должны автоматически выкатывать сервисы.
