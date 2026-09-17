# OkuTutor Ops — Production & Observability

## Структура

```
monitoring/           # 1 Dokploy Application okututor-monitoring (prometheus+grafana+loki+promtail+alertmanager+telegram-bot)
metrics/ — УДАЛЕНА (2026-09-17), весь мониторинг в monitoring/ (см. monitoring/README.md)
ops/docker/           # docker-compose.prod.yml (app, опц.), DEPLOY.md
ops/backup/           # pg_dump nightly
prod-config/          # НЕ в git — реальные .env.prod (только .example в git)
```

## Быстрый старт Dokploy

`monitoring/README.md` — `cp .env.example .env && docker compose up -d` (6 контейнеров, healthchecks, persistent volumes).
См. также `docs/DEPLOYMENT.md`, `ops/docker/DEPLOY.md`, `docs/architecture/DEVOPS_ARCHITECTURE.md`.
