# INFRASTRUCTURE_AUDIT — 2026-09-16

- Design: 2 VPS + Neon + Cloudflare + R2 — документировано в DEVOPS_ARCHITECTURE.md, частично divergent в коде
- Backend Dockerfile multi-stage OTel agent 2.14.0 ✅
- docker-compose.yml dev (postgres/redis/mailpit) ✅
- docker-compose.prod.yml еще гоняет postgres/redis/frontend (противоречит Neon/Cloudflare) — legacy
- monitoring: metrics/docker-compose.yml один файл ✅, ops/monitoring дубликат — удалить
- Env: application-prod.yml strict, .env.example ок, prod-config vs metrics .env дублирование
- Observability: prometheus scrape 401 (basic_auth закомменчен), alloy docker.sock, retention 30/30/7
- CI: backend.yml test+package, frontend.yml lint+build (без test), нет Trivy/Dokploy deploy
- Backup: docs only, нет cron/скрипта

Files: metrics/docker-compose.yml, ops/docker/docker-compose.prod.yml, metrics/prometheus/prometheus.yml, Dockerfile
