# OkuTutor — DevOps Architecture (Production)

> **Принцип:** monitoring наблюдает, app работает, Neon хранит, Cloudflare отдаёт. **1 Dokploy Application `okututor-monitoring`** = `monitoring/docker-compose.yml` (6 контейнеров). Никакой зависимости app от мониторинга.

**Версия:** 1.1 — 2026-09-17 · Java 21 / Spring Boot 3.5 · Dokploy · Neon · Cloudflare

## 1. Роли

### Monitoring — единый Dokploy Application `okututor-monitoring`

```
monitoring/docker-compose.yml (network monitoring, volumes persistent)
├── Prometheus   9090 (scrape backend:8080/actuator/prometheus, rules okututor-alerts.yml, retention 15d)
├── Grafana      3000 (provisioning Prometheus+Loki, dashboard OkuTutor — Production Overview, admin via env)
├── Loki         3100 (filesystem TSDB, retention 168h, -config.expand-env=true)
├── Promtail     9080 (Docker logs → Loki, labels job/container/service/level only)
├── Alertmanager 9093 (route critical/warning → webhook http://telegram-bot:8085/alert)
└── Telegram Bot 8085 (python-telegram-bot, /start /status /test /chatid, whitelist TELEGRAM_ALLOWED_CHAT_IDS)
# Без Tempo, Alloy, OTel Collector, Redis, Kafka, ES, postgres-exporter
```

**Задача:** Если backend DOWN, Prometheus `up==0` → Alertmanager → Telegram Bot → Admin. Grafana/Loki/Promtail — private network, наружу только Grafana через Dokploy/Reverse Proxy.

### Application

```
Backend 8080 (Spring Boot, prod,jsonlog, Hikari 20/5, leak 10s)
# БЕЗ Postgres/Frontend на VPS — Neon + Cloudflare
# БЕЗ Redis (удалён, rate-limit = LocalRateLimiter in-memory)
```

### Frontend — Cloudflare

```
Cloudflare Pages / CDN
  ├─ DNS / CDN / WAF / SSL (auto)
  ├─ frontend (VITE_API_URL=https://api.okututor.kg)
  └─ R2 (avatars/resumes/legal, presigned PUT)
```
UptimeRobot → `https://okututor.kg` + `https://api.okututor.kg/actuator/health/ready`.

### Database — Neon (managed)

```
Neon PostgreSQL (ep-shy-art-*.neon.tech)
  └─ metrics: HikariCP (active/max/pending) + backend health
```

## 2. Схема

```
                Cloudflare (Frontend, DNS/CDN/WAF, R2)
                         │
                   api.okututor.kg  ────────┐
                         │                  │
                  ┌──────▼──────┐           │
                  │  APPLICATION│           │  /actuator/prometheus (authenticated)
                  │  SpringBoot │───────────┼──────────┐
                  │             │ logs      │          │
                  └──────┬──────┘           │          │
                         │                  │          │
                   ┌─────▼─────┐            │          │
                   │  NeonDB   │◄───────────┘          │
                   └───────────┘                       │
                                                       ▼
                     ┌──────────────────────────────┐
External Monitor ──→ │  monitoring (1 Dokploy App)  │
(UptimeRobot)        │  Prometheus ──┐              │
                     │  Grafana      │              │
                     │  Loki ←───────┼── Promtail ──┘
                     │  Alertmanager ──→ telegram-bot ──→ Telegram Admin
                     └──────────────────────────────┘
```

**Если backend DOWN:** Prometheus `up{job="okututor-backend"}==0` 2m → Alertmanager → bot → `[CRITICAL]`.
**Если monitoring DOWN:** внешний UptimeRobot → резерв.

## 3. Что где скрейпится

| Target | Порт | Что |
|--------|------|-----|
| prometheus | 9090 | self |
| okututor-backend | 8080 `/actuator/prometheus` | Spring/JVM/Hikari/business `okututor_*` |
| alertmanager | 9093 |  |
| loki | 3100 |  |

`monitoring/prometheus/prometheus.yml` — `targets: ["backend:8080"]` (same host добавить backend в сеть `monitoring` или `host.docker.internal`; другой host — `api.okututor.kg:443` scheme https + BasicAuth). Не хардкодить несуществующий host. Promtail: `/var/lib/docker/containers` + `/var/run/docker.sock` → Loki.

## 4. Backend expose

`application-prod.yml` `management.endpoints.web.exposure.include=health,prometheus`, `SecurityConfig.java:101` `/actuator/prometheus` `authenticated()`. Prometheus scrape внутри сети или с BasicAuth.

Metrics (Micrometer, низкая cardinality): `http_server_requests_seconds` (method/uri/status), `jvm_*`, `hikaricp_*`, `okututor_resumes_*`, `okututor_auth_*`, `okututor_moderation_*`, `okututor_conversations/messages/views` — без userId/email/chatId labels.

## 5. Логи

`logback-spring.xml` `jsonlog` profile → `{"timestamp","level","service":"okututor-backend","environment":"production","requestId","message"}` + `RequestCorrelationFilter` `X-Request-Id` → MDC. Promtail → Loki labels `job/container/service/level/environment` only (без url/query). Structured metadata для requestId/traceId.

**Запрещено логировать:** password, JWT, refresh, OAuth secrets, cookies, API keys, TG_BOT_TOKEN, chatId в application logs.

## 6. Telegram

* **monitoring/telegram-bot/bot.py** — Python `python-telegram-bot` + Flask `8085`: `/start` → chatId, `/chatid`, `/status` (проверяет Alertmanager `/ -/healthy`), `/test` → `[TEST]`, `POST /alert` от Alertmanager → human-readable `[CRITICAL]/[RESOLVED]` + Grafana URL. Whitelist `TELEGRAM_ALLOWED_CHAT_IDS`, Flask `/health`.
* **Backend API:** `GET /api/v1/admin/monitoring/telegram` + `POST /connect` — `@PreAuthorize(ADMIN/SUPER_ADMIN)`, `MonitoringProperties` (`TELEGRAM_CHAT_ID`), возвращает только `{chatId,connected}`, никогда токен. Не хранит token в БД.
* Alertmanager → `webhook_configs: http://telegram-bot:8085/alert` (токен только в bot env).

## 7. Один файл

```bash
# Monitoring — один Dokploy Application
cd monitoring
cp .env.example .env   # GRAFANA_ADMIN_*, TELEGRAM_BOT_TOKEN/CHAT_ID/ALLOWED
docker compose --env-file .env.example config
docker compose up -d
curl http://localhost:9090/-/healthy && curl http://localhost:3100/ready && curl http://localhost:9093/-/healthy

# App — отдельный Dokploy Application (опц. ops/docker/docker-compose.prod.yml)
git pull && docker compose pull && docker compose up -d --remove-orphans
```

`prod-config/*.prod` и `monitoring/.env` — **никогда в git** (`.gitignore` `*.env` + `!*.env.example`), только `.example`. Dokploy → Environment → вставка.

## 8. Retention & Backup

Prometheus `15d` (`PROMETHEUS_RETENTION`), Loki `168h` (`LOKI_RETENTION_PERIOD`), volumes `prometheus_data/grafana_data/loki_data/alertmanager_data` persistent. Дашборды/rules в Git (`grafana/dashboards/*.json`, `prometheus/rules/*.yml`). `ops/backup/README.md` — `pg_dump -Fc` nightly + volume snapshot.

## 9. Failure тесты

`docker stop okututor-backend` → `BackendHighErrorRate/InstanceDown` → Telegram; `VPS poweroff` → UptimeRobot; `DB fail` → `DbPoolExhaustion`; `5xx spike` → `BackendHighErrorRate`; `fallocate` → `DiskWarning` (если node-exporter); `docker stop prometheus` → `PrometheusDown`.

## 10. Где что лежит (IaC)

```
monitoring/               # ← ЕДИНСТВЕННЫЙ источник мониторинга (1 Dokploy App = 6 контейнеров)
├── docker-compose.yml
├── .env.example
├── prometheus/{prometheus.yml,rules/okututor-alerts.yml}
├── grafana/{provisioning/{datasources/datasources.yml,dashboards/dashboards.yml},dashboards/okututor-overview.json}
├── loki/loki-config.yml
├── promtail/promtail-config.yml
└── telegram-bot/{Dockerfile,requirements.txt,bot.py}

metrics/ — УДАЛЕНА (2026-09-17), весь мониторинг в monitoring/ (см. monitoring/README.md)
ops/docker/docker-compose.prod.yml  # app (опц.)
prod-config/.env.*.prod.example
backend/  (Micrometer Prometheus, Hikari, SecurityConfig)
frontend/ (Cloudflare Pages)
```

**Правило:** `monitoring/` (1 app) — наблюдает, backend — работает, Cloudflare — отдаёт, Neon — хранит, UptimeRobot — страхует. Без Redis/Kafka/ES/Tempo.
