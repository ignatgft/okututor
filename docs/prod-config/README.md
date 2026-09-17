# prod-config — реальные секреты (НЕ коммитить) — 2026-09-17 обновлено: единый .env на сервис

Эта папка хранит **только `.example` шаблоны** (git-ятся). Реальные `.prod` / `.env` — отдельно (1Password / Vault / Dokploy Env) и в `.gitignore`.
Единый принцип проекта: **один сервис = один `.env` (gitignore) + один `.env.example` (в git)**:
- `backend/.env` + `backend/.env.example` — Spring Boot (DB_*, JWT_SECRET, R2_*, LIVEKIT_*, GOOGLE_*, MAIL_*, REDIS_*, OTEL_*)
- `frontend/.env` + `frontend/.env.example` — Vite (`VITE_API_URL`, `VITE_APP_ENV`, `VITE_API_MODE`, `VITE_GA_*`)
- `monitoring/.env` + `monitoring/.env.example` — `monitoring/` stack (`GRAFANA_ADMIN_*`, `TELEGRAM_BOT_TOKEN`, `BACKEND_SCRAPE_TARGET`) — ключи из удалённой `metrics/.env.example` перенесены сюда, не удалены

## Файлы

- `.env.backend.prod.example` → теперь синхронизирован с `backend/.env.example` (единственный источник, не дублировать)
- `.env.monitoring.prod.example` → синхронизирован с `monitoring/.env.example`
- `metrics/.env.example` — **УДАЛЕНА** вместе с папкой `metrics/` (2026-09-17), все ключи перенесены в `monitoring/.env.example` (TG_* алиасы, HEALTHBOT_*, GRAFANA_URL)

## Правила

- Никогда `git add prod-config/*.prod`
- Ротация при утечке: смени JWT/LIVEKIT/R2/TG_BOT_TOKEN/GRAFANA_PASSWORD
- Проверка: `docker compose -f ops/docker/docker-compose.prod.yml config -q`
