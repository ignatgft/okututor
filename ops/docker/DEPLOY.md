# Dokploy Deploy — OkuTutor Full Stack + Observability

## 1. Подготовка

- Ubuntu 22.04, Docker, Dokploy (https://dokploy.com)
- Домен: `okututor.com` (frontend) + `api.okututor.com` (backend) + `grafana.okututor.com` (опц.) — Cloudflare DNS → VPS IP, Proxy ON, SSL Auto

## 2. Приложения в Dokploy

### Monitoring — `okututor-monitoring` (1 Application)

Dokploy → Create Project → Create Application `okututor-monitoring` → Source Git `https://github.com/ignatgft/okututor-backend` branch `main` → **Compose Path** `monitoring/docker-compose.yml` → Environment из `monitoring/.env.example` (`GRAFANA_ADMIN_*`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALLOWED_CHAT_IDS`, `PROMETHEUS_RETENTION=15d`, `LOKI_RETENTION_PERIOD=168h`) → Deploy → `docker compose up -d` поднимает `prometheus/grafana/loki/promtail/alertmanager/telegram-bot` (сеть `monitoring`, volumes persistent).

### Backend — `okututor-backend` (отдельный Application, опц.)

Dokploy → Create Application `okututor-backend` → Compose `ops/docker/docker-compose.prod.yml` (или `backend/Dockerfile`) → Environment из `prod-config/.env.backend.prod` (DB_* Neon, JWT_SECRET, R2_*, LIVEKIT_*, GOOGLE_*, MAIL_*) → Deploy.

Frontend — Cloudflare Pages, `VITE_API_URL=https://api.okututor.com`.

## 3. Env

Dokploy → Environment → вставь секреты. **Никогда не коммить `prod-config/*.prod` и `monitoring/.env` — только `.example`.**

## 4. Volumes

Dokploy автоматически создаёт `prometheus_data, grafana_data, loki_data, alertmanager_data` (monitoring) + `pgdata/uploads` (app если используется). Backup см. `ops/backup/README.md` — nightly `pg_dump` + host volume snapshot. Дашборды/rules в Git, пересоздание volumes не теряет конфигурацию.

## 5. Deploy & проверка

```bash
# локально
cd monitoring && docker compose --env-file .env.example config -q
# в Dokploy — нажми Deploy
```

Проверка:

```bash
curl https://api.okututor.com/actuator/health/ready   # {"status":"UP"}
curl https://okututor.com/health                      # frontend
https://grafana.okututor.com (admin / ***)
curl https://api.okututor.com/actuator/prometheus | head  # требует auth / внутренний scrape
# мониторинг (на VPS где monitoring)
curl http://localhost:9090/-/healthy  # prometheus
curl http://localhost:3100/ready       # loki
curl http://localhost:9093/-/healthy   # alertmanager
curl http://localhost:3000/api/health  # grafana
curl http://localhost:8085/health      # telegram-bot
```

Backend scrape: `monitoring/prometheus/prometheus.yml` `targets: ["backend:8080"]` — для same-host добавить backend в сеть `monitoring` или `host.docker.internal`; для другого host — `api.okututor.com:443` с https/BasicAuth (настройка в README).

## 6. Telegram Bot

`@BotFather` → `/newbot` → `TELEGRAM_BOT_TOKEN` → в monitoring env redeploy → `/start` → `Chat ID: 123` → `TELEGRAM_CHAT_ID=123` + `TELEGRAM_ALLOWED_CHAT_IDS=123` redeploy → `/test` → `[TEST] OkuTutor`, `/status` → `Bot: OK`, `/chatid` → id. Alertmanager `http://telegram-bot:8085/alert` шлёт `[CRITICAL] OkuTutor` / `[RESOLVED]`. Токен только в env, не в БД.

API: `GET /api/v1/admin/monitoring/telegram` (ADMIN) → `{chatId, connected}`.

## 7. Внешний uptime

UptimeRobot → `https://api.okututor.com/actuator/health` (60s) + `https://okututor.com` — страхует падение всего VPS (включая monitoring).

## 8. Logs

- JSON: `SPRING_PROFILES_ACTIVE=prod,jsonlog` (default в prod)
- Correlation: `X-Request-Id` → MDC → Loki (`job/container/service/level`)
- Retention: Prometheus 15d, Loki 168h (configurable `PROMETHEUS_RETENTION`, `LOKI_RETENTION_PERIOD`)
- Без Redis/Kafka/Tempo — только Promtail → Loki.

## 9. Архитектура

```
monitoring/ (1 Dokploy App = 6 контейнеров) ──► Grafana (Provisioning) ──► Prometheus + Loki
backend/spring-boot ──► /actuator/prometheus ──► Prometheus ──► Alertmanager ──► telegram-bot ──► Telegram
docker logs ──► Promtail ──► Loki
```
`metrics/` — УДАЛЕНА (2026-09-17), см. `monitoring/`.
