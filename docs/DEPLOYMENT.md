# OkuTutor — Deployment (Dokploy, Cloudflare, Neon)

> **Monitoring — 1 Dokploy Application:** `monitoring/docker-compose.yml` — `prometheus, grafana, loki, promtail, alertmanager, telegram-bot` (6 контейнеров, сеть `monitoring`, volumes persistent).
> **App:** `backend` (Spring Boot) + `frontend` (Cloudflare Pages) + `Neon` (Postgres). Без Redis.

## Monitoring — один Dokploy Application `okututor-monitoring`

```bash
# локально
cd monitoring
cp .env.example .env   # GRAFANA_ADMIN_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ALLOWED_CHAT_IDS
docker compose --env-file .env.example config  # валидация
docker compose up -d
docker compose ps
curl http://localhost:9090/-/healthy   # prometheus
curl http://localhost:3100/ready        # loki
curl http://localhost:9093/-/healthy    # alertmanager
curl http://localhost:3000/api/health   # grafana
curl http://localhost:8085/health       # telegram-bot
# Grafana http://localhost:3000 (admin / password из .env)
```

**Dokploy:**

1. Dokploy → Projects → New Project → Create Application `okututor-monitoring`
2. Source: текущий Git repo, Branch `main`, **Compose Path** `monitoring/docker-compose.yml`
3. Environment → вставить из `monitoring/.env.example`:
   `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALLOWED_CHAT_IDS`, `PROMETHEUS_RETENTION=15d`, `LOKI_RETENTION_PERIOD=168h`, `GRAFANA_DOMAIN`
4. Domain → только Grafana наружу (HTTPS via Dokploy/Reverse Proxy). Prometheus/Loki/Alertmanager — private `monitoring` network.
5. Deploy → `docker compose up -d` поднимает все 6 контейнеров.

Обновление (IaC, dashboards/rules в Git):

```bash
git pull
docker compose pull
docker compose up -d --remove-orphans
docker system prune -f
# Grafana provisioning/dashboards, Prometheus rules подтянутся автоматом
```

### Backend scrape

Prometheus: `monitoring/prometheus/prometheus.yml` → `backend:8080/actuator/prometheus` (если backend в том же Dokploy host — `host.docker.internal` или добавить backend в сеть `monitoring`; если на другом host — `https://api.okututor.kg`). Не хардкодить несуществующий host. `SecurityConfig` `/actuator/prometheus` — `authenticated()`.

## Application

```bash
# Backend — отдельный Dokploy Application или локально
docker compose -f ops/docker/docker-compose.prod.yml up -d  # если используется
# или backend/Dockerfile напрямую
curl http://localhost:8080/actuator/health/ready
```

Dokploy: Create Project `okututor` → Create Application `okututor-backend` → Compose Path `ops/docker/docker-compose.prod.yml` (или `backend/Dockerfile`) → Environment из `prod-config/.env.backend.prod` (DB_* Neon `ep-shy-art-*.neon.tech`, JWT_SECRET, R2_*, LIVEKIT_*, GOOGLE_*, MAIL_*, TG_BOT_TOKEN) → Deploy.

Frontend — **не на VPS** (Cloudflare Pages): `VITE_API_URL=https://api.okututor.kg`. DNS/CDN/WAF/SSL — Cloudflare.

Neon — managed Postgres, Hikari `20/5`, `leak-detection 10s`, alert `active/max >85%`.

## Telegram bot

1. `@BotFather` → `/newbot` → `TELEGRAM_BOT_TOKEN`
2. Запусти bot → `/start` → `Chat ID: 123...`
3. `TELEGRAM_CHAT_ID=123`, `TELEGRAM_ALLOWED_CHAT_IDS=123` (через запятую для нескольких) → redeploy monitoring
4. `/test` → `[TEST] OkuTutor`, `/status` → `Bot: OK`, `/chatid` → id
5. Останови backend на 2м → `[CRITICAL] OkuTutor` → `[RESOLVED]` через bot webhook `http://telegram-bot:8085/alert`

Токен только в env, никогда в БД/логах/API. `GET /api/v1/admin/monitoring/telegram` (ADMIN) возвращает только `{chatId, connected}`.

## Проверка failure

```bash
docker stop okututor-backend  # BackendDown → up==0 2m → Telegram CRITICAL
# Внешний UptimeRobot → https://api.okututor.kg/actuator/health/ready (60s) страхует падение monitoring
fallocate -l 1G /tmp/fill && sleep 310 && rm /tmp/fill  # Disk (если node-exporter включён)
```

## Внешний uptime

UptimeRobot/Checkly → `https://api.okututor.kg/actuator/health/ready` + `https://okututor.kg` — независимо от monitoring.

## Где что лежит (IaC)

```
monitoring/               # ← ЕДИНСТВЕННЫЙ источник мониторинга (1 Dokploy App)
├── docker-compose.yml    # prometheus+grafana+loki+promtail+alertmanager+telegram-bot
├── .env.example
├── prometheus/{prometheus.yml,rules/okututor-alerts.yml}
├── grafana/{provisioning/{datasources/datasources.yml,dashboards/dashboards.yml},dashboards/okututor-overview.json}
├── loki/loki-config.yml
├── promtail/promtail-config.yml
└── telegram-bot/{Dockerfile,requirements.txt,bot.py}

metrics/ — УДАЛЕНА (2026-09-17), весь мониторинг в monitoring/ (см. monitoring/README.md)
ops/docker/docker-compose.prod.yml  # app (если используется)
prod-config/.env.*.prod.example     # шаблоны, реальные *.prod вне git (Dokploy Env)
backend/  (Spring Boot 3.5 / Java 21, Micrometer Prometheus, Hikari)
frontend/ (Cloudflare Pages)
```

**Правило:** `monitoring/` — наблюдает (1 app), backend — работает, Cloudflare — отдаёт, Neon — хранит. Без Redis/Kafka/ES.

## Retention & Backup

Prometheus `15d` (`PROMETHEUS_RETENTION`), Loki `168h` (`LOKI_RETENTION_PERIOD`), volumes `prometheus_data/grafana_data/loki_data/alertmanager_data` переживают restart. Backup host volumes; dashboards/rules в Git. `ops/backup/README.md` — `pg_dump -Fc` nightly.

## Порты

Grafana 3000, Prometheus 9090, Loki 3100, Alertmanager 9093, telegram-bot 8085, Promtail 9080 — configurable via env.
