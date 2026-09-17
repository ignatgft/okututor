# OkuTutor Monitoring

Production observability stack — **1 Dokploy Application = 1 docker-compose = 6 containers**.

```
Spring Boot /actuator/prometheus ──► Prometheus ──► Alertmanager ──► Telegram Bot ──► Admin Telegram
                logs (Docker) ──► Promtail ──► Loki ──► Grafana ◄── Prometheus + Loki
```

## Components

- **Prometheus** `:9090` — scrape `backend:8080/actuator/prometheus`, rules `okututor-alerts.yml`, retention `15d`
- **Grafana** `:3000` — auto-provisioned Prometheus + Loki, dashboard `OkuTutor — Production Overview`
- **Loki** `:3100` — centralized logs, retention `168h` (7d), filesystem TSDB
- **Promtail** — ships Docker container logs to Loki (low-cardinality labels only)
- **Alertmanager** `:9093` — routes `critical/warning` → Telegram via bot webhook `http://telegram-bot:8085/alert`
- **Telegram Bot** `:8085` — **Java 21 + Spring Boot + `telegrambots 6.9`** (polling), `/start /status /test /chatid`, whitelist `TELEGRAM_ALLOWED_CHAT_IDS`, health `GET /health`, Alertmanager webhook `POST /alert`

No Redis, no Kafka, no Elasticsearch, no extra DB — minimal MVP.

> **Приватный репозиторий мониторинга:** `https://github.com/ignatgft/okututor-monitoring` (private, `main`). 1:1 копия `monitoring/` для отдельного Dokploy Application. Синхронизируется из основного репо.

## Quick start (local)

```bash
cd monitoring
cp .env.example .env
# edit .env — set GRAFANA_ADMIN_PASSWORD and TELEGRAM_BOT_TOKEN
docker compose up -d
docker compose ps
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
curl http://localhost:3100/ready
curl http://localhost:9093/-/healthy
curl http://localhost:8085/health
```

Grafana: http://localhost:3000 (admin / password from .env)
Prometheus: http://localhost:9090
Alertmanager: http://localhost:9093

## Dokploy deployment — 1 Application

### 1. Create Application

Dokploy → Projects → New Project → Create Application
Name: `okututor-monitoring`

### 2. Connect repository

Git provider → select current repo. Build type: **Docker Compose**.
Compose path: `monitoring/docker-compose.yml`

### 3. Environment

Copy values from `monitoring/.env.example` into Dokploy → Environment Variables:

| Variable | Required | Example |
|---|---|---|
| `GRAFANA_ADMIN_USER` | yes | `admin` |
| `GRAFANA_ADMIN_PASSWORD` | yes | strong 32+ |
| `TELEGRAM_BOT_TOKEN` | yes | `123:ABC` |
| `TELEGRAM_CHAT_ID` | yes | `123456789` |
| `TELEGRAM_ALLOWED_CHAT_IDS` | yes | `123456789` |
| `PROMETHEUS_RETENTION` | no | `15d` |
| `LOKI_RETENTION_PERIOD` | no | `168h` |
| `GRAFANA_DOMAIN` | if exposed | `grafana.okututor.kg` |

### 4. Domain / reverse proxy

Expose **only Grafana** via Dokploy domain + HTTPS. Prometheus/Loki/Alertmanager stay on private `monitoring` Docker network.

### 5. Deploy

Deploy. Dokploy runs `docker compose up -d` and starts all 6 containers with persistent volumes.

### 6. Backend scrape

Backend runs as a separate Dokploy Application (or same host). Prometheus needs to reach `GET /actuator/prometheus`.

- Same host Docker network: add backend to `monitoring` network externally or use `host.docker.internal:8080`.
- Different hosts / external: set in `monitoring/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: okututor-backend
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["api.okututor.kg:443"]  # or internal IP:8080
    scheme: https
    # basic_auth if backend protects /actuator/prometheus
```

Do not hardcode a hostname that does not exist — choose the one your Dokploy network provides.

## Telegram setup

1. Talk to `@BotFather` → `/newbot` → copy token.
2. Set `TELEGRAM_BOT_TOKEN` in `.env` / Dokploy env, redeploy.
3. Start chat with your bot → `/start` → bot replies with `Chat ID: 123...`.
4. Set `TELEGRAM_CHAT_ID=123...` and `TELEGRAM_ALLOWED_CHAT_IDS=123...` (comma-separated for multiple admins), redeploy.
5. `/test` — should deliver `[TEST] OkuTutor` to Telegram.
6. Trigger alert (stop backend 2m) → expect `[CRITICAL] OkuTutor` → recovery `[RESOLVED]`.

Bot never logs token/JWT/cookies. Token stays only in env.

## Persistence & retention

Volumes: `prometheus_data`, `grafana_data`, `loki_data`, `alertmanager_data` — survive `docker compose down/up`.
Retention: Prometheus `PROMETHEUS_RETENTION=15d` (7–15d recommended), Loki `LOKI_RETENTION_PERIOD=168h`.
Grafana dashboards/rules are in Git (`grafana/dashboards/*.json`, `prometheus/rules/*.yml`), so recreating volumes restores visualization.

Include volumes in host backup; losing them loses history but not configuration.

## Security

- Grafana admin password via env, sign-up disabled.
- Prometheus `/actuator/prometheus` is `authenticated()` in `SecurityConfig.java:101` — scrape via internal network / BasicAuth.
- Telegram token never stored in DB, never returned by API (`GET /api/v1/admin/monitoring/telegram` returns only `chatId`+`connected`).
- Alertmanager/Telegram whitelist: `TELEGRAM_ALLOWED_CHAT_IDS`.

## Verification checklist

```bash
docker compose config                    # compose valid
curl -sf http://localhost:9090/-/healthy && echo prometheus ok
curl -sf http://localhost:3100/ready && echo loki ok
curl -sf http://localhost:9093/-/healthy && echo alertmanager ok
curl -sf http://localhost:3000/api/health && echo grafana ok
curl -sf http://localhost:8085/health && echo telegram-bot ok
# grafana datasource auto-provisioned: Prometheus + Loki preconfigured
# dashboard auto-loaded: /var/lib/grafana/dashboards/okututor-overview.json
```

## Ports (all configurable via env)

| Service | Default |
|---|---|
| Grafana | 3000 |
| Prometheus | 9090 |
| Loki | 3100 |
| Alertmanager | 9093 |
| Telegram bot (internal) | 8085 |
| Promtail | 9080 (internal) |

## Troubleshooting

- Bot `/start` shows `Access denied` → `TELEGRAM_ALLOWED_CHAT_IDS` does not contain your chat; add it and redeploy.
- Prometheus target `DOWN` → check `BACKEND_SCRAPE_TARGET` and that backend `/actuator/prometheus` is reachable + authenticated.
- Loki no logs → check Promtail mounts `/var/lib/docker/containers` and `docker.sock`.

## Relation to `metrics/`

Legacy `metrics/` (Tempo, Alloy, postgres/redis exporters) is deprecated. New stack is `monitoring/` — self-contained for Dokploy single-app deploy.
