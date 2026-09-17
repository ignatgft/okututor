# OkuTutor — Документация (единый источник)

> **2026-09-17 реорганизация:** все доки из проекта собраны в `backend/docs/` (канонический источник, находится в корне проекта в папке бэка). Папка `docs/` в корне — зеркало для удобства навигации. Папка `metrics/` удалена — мониторинг только в `monitoring/`. На каждом сервисе теперь **один `.env` (gitignore) + один `.env.example` (в git)**, ключи из удалённых файлов перенесены, не удалены.

## Структура

```
backend/docs/
├── ARCHITECTURE.md              # общая архитектура (Spring Boot + React + Neon + Cloudflare + monitoring)
├── DEPLOYMENT.md                # деплой Dokploy + Cloudflare + Neon
├── PRODUCTION_READINESS.md      # smoke 24 теста, P0 рекомендации
├── RUNBOOK.md                   # что делать при падении (Backend DOWN, Neon, VPS, Telegram)
├── SECURITY_FINAL_AUDIT.md      # 15 проверок безопасности PASS
├── AGENT.md                     # правила для AI-агентов (Free MVP, lifecycle резюме)
├── architecture/
│   └── DEVOPS_ARCHITECTURE.md   # детальная DevOps архитектура (1 Dokploy App monitoring)
├── audit/
│   ├── ARCHITECTURE_AUDIT.md
│   ├── BACKEND_AUDIT.md
│   ├── FRONTEND_AUDIT.md
│   ├── INFRASTRUCTURE_AUDIT.md
│   ├── LEGACY_AUDIT.md
│   ├── SECURITY_AUDIT.md
│   └── IMPLEMENTATION_ORDER.md
├── monitoring/
│   └── README.md                # копия monitoring/README.md (6 контейнеров, Telegram bot)
├── ops/
│   ├── README.md                # ops структура
│   ├── docker/DEPLOY.md         # Dokploy деплой
│   └── backup/README.md         # pg_dump nightly
└── prod-config/
    └── README.md                # шаблоны .env.prod, правила ротации
```

## Где искать

- **Мониторинг:** `monitoring/README.md` + `backend/docs/monitoring/README.md` — 6 контейнеров, Prometheus/Loki/Grafana/Promtail/Alertmanager/Telegram Bot, healthchecks
- **Деплой (подробно):** `docs/DEVOPS_DEPLOYMENT.md` / `backend/docs/DEVOPS_DEPLOYMENT.md` — полная инструкция (локально без домена + прод Dokploy .com, env, сети, проверка)
- **Деплой (кратко):** `backend/docs/DEPLOYMENT.md` / `ops/docker/DEPLOY.md`
- **Архитектура:** `backend/docs/ARCHITECTURE.md` / `backend/docs/architecture/DEVOPS_ARCHITECTURE.md`
- **Безопасность/аудит:** `backend/docs/audit/*`

## Связь с остальной документацией

- `monitoring/README.md` — основной README мониторинга (Dokploy 1 App)
- `ops/docker/DEPLOY.md` — деплой на VPS
- `prod-config/README.md` — секреты (только .example в git)
- `AGENT.md` в корне — правила для агентов (копия в `backend/docs/AGENT.md`)

## Изменения 2026-09-17

- Удалены `metrics/` и `backend/metrics/` (Tempo/Alloy) — весь мониторинг в `monitoring/`
- Унифицированы `.env`: `backend/.env`, `frontend/.env`, `monitoring/.env` — в `.gitignore`, в git только `*.env.example`; ключи из `metrics/.env.example` и `prod-config/*.example` перенесены в соответствующие `.env.example`, не удалены
- Все доки собраны в `backend/docs/` (зеркало `docs/`)

## Проверка

```bash
docker compose -f monitoring/docker-compose.yml config -q
curl -sf http://localhost:9090/-/healthy && echo prometheus ok
curl -sf http://localhost:3100/ready && echo loki ok
```
