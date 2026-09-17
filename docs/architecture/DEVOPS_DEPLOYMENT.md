# DevOps — Подробная развёртка OkuTutor (Backend + Monitoring)

> **Дата:** 2026-09-17 · **Стек:** Spring Boot 3.5 / Java 21, Neon Postgres, Cloudflare R2 + Pages, LiveKit Cloud, Resend, Dokploy, Prometheus + Grafana + Loki + Promtail + Alertmanager + Telegram Bot (Java 21)
> **Принцип:** `monitoring` наблюдает (6 контейнеров, 1 Dokploy App), `backend` работает (1 контейнер, внешняя БД), `frontend` отдаёт Cloudflare, Neon хранит. Без локального Redis/Postgres/Kafka.

## 0. Архитектура

```
                    Cloudflare (prod) / localhost (dev)
                    Frontend (Pages / Vite 5173)  VITE_API_URL=http://localhost:8080 (dev) / https://api.okututor.com (prod)
                              │
                              │  /api, /oauth2
                              ▼
                    ┌─────────────────────┐
                    │  Backend 8080       │  Spring Boot, prod,jsonlog / dev,jsonlog, Hikari 20/5, Flyway V60
                    │  /actuator/health  │  ← внешняя проверка UptimeRobot
                    │  /actuator/prometheus ← Prometheus scrape (permitAll локально, auth в проде через сеть)
                    └──────────┬──────────┘
                               │ logs (json) → Promtail → Loki → Grafana
                               │ metrics → Prometheus → Alertmanager → Telegram Bot → Admin
                               ▼
                    ┌──────────────────────────────┐
                    │  Monitoring (1 Dokploy App)  │  network monitoring (bridge)
                    │  Prometheus 9090 ──┐         │
                    │  Grafana 3000      │         │  provisioning: Prometheus http://prometheus:9090, Loki http://loki:3100
                    │  Loki 3100 ←───────┘         │  retention: Prometheus 15d, Loki 168h (filesystem TSDB)
                    │  Promtail 9080 → Loki        │  volumes: prometheus_data, grafana_data, loki_data, alertmanager_data
                    │  Alertmanager 9093 → Bot 8085│
                    │  Telegram Bot 8085 (Java)    │  /start /status /test /chatid, webhook POST /alert
                    └──────────────────────────────┘
                    Neon Postgres (ep-shy-art-*.neon.tech) — Hikari, R2 (4f6d582d...), LiveKit (ai-kvqd3pth.livekit.cloud)
```

**Локально без домена:** всё на `localhost`: `frontend http://localhost:5173`, `backend http://localhost:8080`, `grafana http://localhost:3000`, `prometheus http://localhost:9090`, `loki http://localhost:3100`. Домены `*.okututor.com` — только для продакшена (примеры в `prod-config/*.example`).

## 1. Требования

- Ubuntu 22.04 / Windows + WSL2, Docker 24+ (`docker compose version v2+`), Git, Dokploy (для продакшена), Cloudflare account (R2 + Pages), Neon Postgres, Resend API key, LiveKit Cloud project
- Домен prod: `okututor.com`, `api.okututor.com`, `grafana.okututor.com` — Cloudflare DNS → VPS IP, Proxy ON, SSL Auto (локально не нужен)

## 2. Переменные окружения — один `.env` на сервис

> **Правило 2026-09-17:** один сервис = один `.env` (gitignore) + один `.env.example` (в git). Ключи из удалённой `metrics/.env.example` перенесены в `monitoring/.env.example`, не удалены. `.gitignore:1` `.env` `*.env` `!*.env.example`.

| Сервис | Шаблон | Локальный файл (gitignore) | Где заполнять в проде |
|--------|--------|----------------------------|-----------------------|
| Backend | `backend/.env.example` (122 строки, APP_*, DB_*, JWT_*, GOOGLE_*, LIVEKIT_*, R2_*, MAIL_*, REDIS_*, PROD/INFRA) | `backend/.env` (Neon `npg_2jeh...`, R2 `0caf...`, LiveKit `APIz...`, Resend `re_MZYP...`, GOOGLE `1451...`) | Dokploy `okututor-backend` → Environment |
| Frontend | `frontend/.env.example` (VITE_API_URL, VITE_APP_ENV, VITE_MOCK_MODE, VITE_GA) | `frontend/.env` (`VITE_API_URL=http://localhost:8080`) | Cloudflare Pages → Environment Variables (`VITE_API_URL=/api` для prod) |
| Monitoring | `monitoring/.env.example` (GRAFANA_*, TELEGRAM_*, PROMETHEUS_RETENTION, BACKEND_SCRAPE_TARGET) | `monitoring/.env` (`GRAFANA_ADMIN_USER=admin`, `GRAFANA_ADMIN_PASSWORD=admin` для локального теста, `TELEGRAM_BOT_TOKEN=8747...`, `TG_ADMIN_CHAT_ID=5402...`) | Dokploy `okututor-monitoring` → Environment |

**Пример генерации секретов:**
```bash
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 32  # GRAFANA_ADMIN_PASSWORD, REDIS_PASSWORD
```

## 3. Локальная разработка (без домена)

### 3.1 Клонирование и env
```bash
git clone https://github.com/ignatgft/okututor.git
cd okututor
git checkout appmod/java-upgrade-20260817055013
cp backend/.env.example backend/.env   # заполни Neon, R2, LiveKit, Resend, GOOGLE (дефолты в backend/.env уже рабочие для dev)
cp frontend/.env.example frontend/.env # VITE_API_URL=http://localhost:8080
cp monitoring/.env.example monitoring/.env # GRAFANA_ADMIN_USER=admin, GRAFANA_ADMIN_PASSWORD=admin (локально), TELEGRAM_BOT_TOKEN (опционально)
```

`backend/.env` для локала: `FRONTEND_URL=http://localhost:5173`, `APP_CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8081`, `SPRING_PROFILES_ACTIVE=dev` (не `prod` — иначе `ProdEnvValidator` требует `https` + `JWT_SECRET`), `OTEL_TRACING_ENABLED=false`.

`monitoring/.env` для локала: `GRAFANA_DOMAIN=localhost`, `GRAFANA_ROOT_URL=http://localhost:3000`, `GRAFANA_EXTERNAL_URL=http://localhost:3000`, `GRAFANA_ADMIN_PASSWORD=admin`, `BACKEND_SCRAPE_TARGET=backend:8080`.

### 3.2 Запуск мониторинга (6 контейнеров)
```bash
cd monitoring
docker compose config -q  # валидация (исправлено: loki-config.yml discover_service_name как list, compactor.delete_request_store: filesystem, grafana datasource uid: prometheus/loki)
docker compose up -d
docker compose ps  # все healthy
curl -sf http://localhost:9090/-/healthy && echo "prometheus ok"
curl -sf http://localhost:3100/ready && echo "loki ok"
curl -sf http://localhost:9093/-/healthy && echo "alertmanager ok"
curl -sf http://localhost:3000/api/health && echo "grafana ok"  # admin/admin локально
curl -sf http://localhost:8085/health && echo "telegram-bot ok"  # {"status":"ok"} или no_token если TELEGRAM_BOT_TOKEN пустой
```
Grafana: `http://localhost:3000` `admin / admin` (локально, volume `okututor-monitoring_grafana_data` — если менял пароль, `docker volume rm okututor-monitoring_grafana_data` и `up -d`).

**Важно 2026-09-17:** `monitoring/loki/loki-config.yml:42` `discover_service_name` теперь `list` (было `true` → `cannot unmarshal bool into []string`), `compactor.delete_request_store: filesystem` (было `invalid compactor config`), `grafana/provisioning/datasources/datasources.yml:3` добавлены `uid: prometheus/loki` (было `Datasource prometheus was not found`).

### 3.3 Запуск бэка (1 контейнер, внешняя БД)
```bash
cd ../backend
docker compose config -q  # valid, network monitoring external okututor-monitoring_monitoring
docker compose up -d --build
docker logs okututor-backend --tail 50  # Started OkututorBackendApplication in 22s, Flyway V60, Hikari Neon OK
curl -sf http://localhost:8080/actuator/health && echo "backend UP"  # {"status":"UP"}
curl -sf http://localhost:8080/actuator/prometheus | head -20  # HELP application_ready_time_seconds (SecurityConfig permitAll для /actuator/prometheus локально, в проде можно authenticated + basic_auth)
```
Бек на `monitoring` сети: `backend:8080` резолвится из `prometheus` (`docker network inspect okututor-monitoring_monitoring` показывает `okututor-backend`, `prometheus`, `grafana`...). Prometheus `http://localhost:9090/api/v1/targets` → `okututor-backend health:up` (было `401` до `SecurityConfig.java:101` `permitAll`, и `no such host` до добавления бэка в сеть).

**Локальный .env бэка использует Neon:** `DB_HOST=ep-shy-art-ayjiw0c3-pooler.c-5.us-east-2.aws.neon.tech`, `DB_PASSWORD=npg_...`, `R2_*`, `LIVEKIT_WS_URL=wss://ai-kvqd3pth.livekit.cloud`. Без локального `postgres/redis` — `backend/docker-compose.yml` удалён (ранее `postgres:16-alpine` + `redis:7-alpine` + `mailpit`), теперь только `backend` сервис. `ops/docker/docker-compose.prod.yml` — legacy prod compose с postgres, не используется локально.

### 3.4 Запуск фронта
```bash
cd ../frontend
npm ci
npm run dev  # http://localhost:5173, VITE_API_URL=http://localhost:8080
# или prod превью:
npm run build && npm run preview
```

### 3.5 Проверка мониторинга локально
```bash
# Генерация трафика для графиков
curl http://localhost:8080/api/v1/tutors | head
curl http://localhost:8080/actuator/prometheus | grep http_server_requests

# Prometheus
curl -s "http://localhost:9090/api/v1/query?query=up{job=\"okututor-backend\"}" | grep -o '"value":\["[^"]*","1"\]'
curl -s "http://localhost:9090/api/v1/query?query=okututor_resumes_pending_moderation" | grep -o '"value":\["[^"]*","[^"]*"\]'

# Loki
curl -s http://localhost:3100/loki/api/v1/label/service/values | grep backend
curl -s "http://localhost:3100/loki/api/v1/label/level/values" # DEBUG,INFO,WARN после dev,jsonlog
# Grafana: http://localhost:3000 → Dashboards → OkuTutor — Production Overview → REQUESTS/SEC, P95, JVM, DB Pool должны показывать данные (ранее N/A из-за 401 и plain logs). Refresh 10s, Time range now-15m.
# Logs: Explore → Loki → {job="docker"} | json | level="ERROR" — теперь есть (ранее No data из-за level пустой)
```

## 4. Продакшен (Dokploy + Cloudflare + Neon)

### 4.1 Подготовка VPS и Dokploy
- Ubuntu 22.04, Docker, Dokploy `https://dokploy.com` установлен, домены `okututor.com`, `api.okututor.com`, `grafana.okututor.com` в Cloudflare DNS → `A` запись на VPS IP, Proxy ON (оранжевое облако), SSL Auto

### 4.2 Monitoring — один Dokploy Application `okututor-monitoring`
1. Dokploy → Projects → Create Project → Create Application `okututor-monitoring`
2. Source: Git `https://github.com/ignatgft/okututor.git` (или `ignatgft/okututor-monitoring` — 1:1 копия `monitoring/`), Branch `main` (или `appmod/java-upgrade-...` для теста), Build Type: **Docker Compose**, Compose Path: `monitoring/docker-compose.yml`
3. Environment → скопируй из `monitoring/.env.example` (локальные `admin/admin` замени на прод):
```
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<32+ случайный, openssl rand -base64 32>
GRAFANA_DOMAIN=grafana.okututor.com
GRAFANA_ROOT_URL=https://grafana.okututor.com
GRAFANA_EXTERNAL_URL=https://grafana.okututor.com
TELEGRAM_BOT_TOKEN=8747922929:AAEd... (от @BotFather)
TELEGRAM_CHAT_ID=5402114991
TELEGRAM_ALLOWED_CHAT_IDS=5402114991
PROMETHEUS_RETENTION=15d
LOKI_RETENTION_PERIOD=168h
BACKEND_SCRAPE_TARGET=backend:8080  # если бек на том же Dokploy host в сети monitoring, иначе https://api.okututor.com:443
```
4. Domain → добавь `grafana.okututor.com` → Enable HTTPS (Let's Encrypt via Dokploy), **только Grafana наружу**, Prometheus/Loki/Alertmanager оставь private `monitoring` network
5. Deploy → `docker compose up -d` поднимет 6 контейнеров с volumes `prometheus_data, grafana_data, loki_data, alertmanager_data` (persistent)
6. Проверка на VPS (SSH):
```bash
docker compose -f monitoring/docker-compose.yml ps
curl -sf http://localhost:9090/-/healthy && echo prometheus ok
curl -sf http://localhost:3100/ready && echo loki ok
curl -sf https://grafana.okututor.com/api/health  # admin / прод пароль
```

### 4.3 Backend — отдельный Dokploy Application `okututor-backend` (или тот же VPS, другая сеть)
1. Dokploy → Create Application `okututor-backend` → Source Git `https://github.com/ignatgft/okututor-backend.git` (или монолит), Compose Path `backend/Dockerfile` (или `ops/docker/docker-compose.prod.yml` если нужен), Branch `main`
2. Environment → из `prod-config/.env.backend.prod.example` (`.com` домены) + `backend/.env`:
```
DB_HOST=ep-shy-art-ayjiw0c3-pooler.c-5.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_2jehUd4WwtFk  # Neon, ротируй при утечке
JWT_SECRET=<64+ base64, openssl rand -base64 64>  # обязательно >=32, ProdEnvValidator упадёт без него
FRONTEND_URL=https://okututor.com
APP_CORS_ORIGINS=https://okututor.com,https://www.okututor.com
APP_TRUSTED_PROXIES=10.0.0.0/24,172.18.0.0/16  # Dokploy proxy IPs
MAIL_HOST=smtp.resend.com
MAIL_PORT=587
MAIL_USER=resend
RESEND_API_KEY=re_MZYP...
MAIL_FROM=OkuTutor <no-reply@okututor.com>
GOOGLE_CLIENT_ID=145126...
GOOGLE_CLIENT_SECRET=GOCSPX-...
LIVEKIT_WS_URL=wss://ai-kvqd3pth.livekit.cloud
LIVEKIT_API_KEY=APIz...
LIVEKIT_API_SECRET=6RBG...
R2_ENDPOINT=https://4f6d582d99bc2116218ca2de8893513e.r2.cloudflarestorage.com
R2_ACCOUNT_ID=4f6d582d99bc2116218ca2de8893513e
R2_ACCESS_KEY_ID=0caf...
R2_SECRET_ACCESS_KEY=de25...
R2_BUCKET=okututor
R2_PUBLIC_BASE_URL=https://pub-4f6d582d99bc2116218ca2de8893513e.r2.dev
SPRING_PROFILES_ACTIVE=prod,jsonlog
OKUTUTOR_ENV=production
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4317  # если Tempo выключен, OTEL_TRACING_ENABLED=false
```
3. Domain → `api.okututor.com` → HTTPS, **внутренний** `backend:8080` добавь в сеть `monitoring` (Dokploy → Application → Network → Attach to `okututor-monitoring_monitoring` или `host.docker.internal:8080`), иначе Prometheus на другом VPS не достанет `backend:8080` — ставь `BACKEND_SCRAPE_TARGET=api.okututor.com:443` + `scheme: https` в `monitoring/prometheus/prometheus.yml` + `basic_auth` если `SecurityConfig` требует
4. Deploy → `docker logs okututor-backend --tail 100` → `Started OkututorBackendApplication`, `curl https://api.okututor.com/actuator/health/ready → {"status":"UP"}` (нужен JWT или `permitAll` для health)

### 4.4 Frontend — Cloudflare Pages (не на VPS)
- Build: `frontend/` → `npm run build` → `dist/` (Vite)
- Cloudflare Pages → Connect Git `https://github.com/ignatgft/front_okututor.git`, Build command `npm run build`, Output `dist`, Environment Variables: `VITE_API_URL=https://api.okututor.com` (prod, не `http://localhost:8080`), `VITE_APP_ENV=production`, `VITE_GA_MEASUREMENT_ID=G-...` (опционально)
- DNS: `okututor.com` → Pages, `api.okututor.com` → VPS, `grafana.okututor.com` → VPS (отдельный Dokploy App)
- Проверка: `curl -I https://okututor.com → cf-cache-status`, `https://okututor.com/api/v1/tutors` → через `api.okututor.com`

### 4.5 Prometheus scrape — бек и мониторинг на разных VPS
- **Один VPS (рекомендуется для локальной сети):** бек в той же `monitoring` сети → `monitoring/prometheus/prometheus.yml:33` `targets: ["backend:8080"]` работает, `SecurityConfig.java:101` `permitAll` для `/actuator/prometheus` локально, в проде можно `authenticated()` + `basic_auth` в prometheus.yml
- **Разные VPS:** в `monitoring/prometheus/prometheus.yml` замени:
```yaml
scrape_configs:
  - job_name: okututor-backend
    metrics_path: /actuator/prometheus
    scheme: https
    static_configs:
      - targets: ["api.okututor.com:443"]
    # basic_auth:
    #   username: prom
    #   password: <PROMETHEUS_BACKEND_PASS>
```
  и открой `api.okututor.com` для Prometheus IP (Cloudflare WAF → Allow), или Tailscale/WireGuard private IP

## 5. Telegram Bot

1. `@BotFather` → `/newbot` → имя `okututor_monitoring_bot` → токен `123456:ABC...`
2. Локально: `TELEGRAM_BOT_TOKEN=123456:ABC...` в `monitoring/.env`, `docker compose -f monitoring/docker-compose.yml up -d --build` → `docker logs okututor-telegram-bot --tail 20` → `Telegram polling started`
3. Напиши боту `/start` → ответ `Chat ID: 5402114991`
4. Прод: `TELEGRAM_CHAT_ID=5402114991`, `TELEGRAM_ALLOWED_CHAT_IDS=5402114991` (через запятую для нескольких админов) → redeploy `okututor-monitoring` → `/test` → `[TEST] OkuTutor`, `/status` → `Bot: OK`, `/chatid` → id
5. Триггер: `docker stop okututor-backend` 2 мин → `InstanceDown` `for: 2m` → `[CRITICAL] OkuTutor` в Telegram → `docker start okututor-backend` → `[RESOLVED]`
6. Токен только в env, не в БД/логах, `GET /api/v1/admin/monitoring/telegram` (ADMIN) возвращает `{chatId, connected}` без токена

## 6. Проверка после деплоя

```bash
# Локально
docker compose -f monitoring/docker-compose.yml ps  # 6 healthy
docker compose -f backend/docker-compose.yml ps     # backend healthy
curl -sf http://localhost:8080/actuator/health && echo "backend UP"
curl -sf http://localhost:9090/-/healthy && echo "prometheus ok"
curl -sf http://localhost:3100/ready && echo "loki ok"
curl -sf http://localhost:9093/-/healthy && echo "alertmanager ok"
curl -sf http://localhost:3000/api/health && echo "grafana ok"  # admin/admin локально, admin/<prod> на проде
curl -sf http://localhost:8085/health && echo "telegram-bot ok"

# Prometheus targets
curl -s http://localhost:9090/api/v1/targets | grep -o '"health":"[^"]*"' | sort | uniq -c  # все up, backend:8080 был down 401 до SecurityConfig fix

# Grafana
# http://localhost:3000 (admin/admin) или https://grafana.okututor.com (admin/<prod>) → Dashboards → OkuTutor — Production Overview → SYSTEM STATUS HEALTHY, REQUESTS/SEC, P95, JVM, DB Pool, ACTIVE ALERTS No firing alerts, LOGS {level="INFO"} / {job="docker"}

# Прод
curl -sf https://api.okututor.com/actuator/health/ready && echo "prod backend UP"
curl -sf https://grafana.okututor.com/api/health && echo "prod grafana ok"
curl -sf https://api.okututor.com/actuator/prometheus | head  # 200 с permitAll локально, 401 с authenticated в проде без basic_auth
```

## 7. Обновление и откат

```bash
git pull
docker compose -f monitoring/docker-compose.yml pull
docker compose -f monitoring/docker-compose.yml up -d --remove-orphans
docker system prune -f  # очистка старых образов
# Grafana dashboards/rules в Git (grafana/dashboards/*.json, prometheus/rules/*.yml), volumes пересоздадутся без потери конфигурации, история Prometheus/Loki (15d/168h) в volumes — бэкапь host volumes
```

Dokploy → Application → Deploy → выберет новый коммит, `docker compose up -d --build` пересоберёт `telegram-bot` (Java 21). Откат: Dokploy → Deployments → Previous → Redeploy.

## 8. Безопасность

- `backend/.env` и `monitoring/.env` в `.gitignore` (`*.env` + `!*.env.example`), `prod-config/*.prod` gitignored, `GRAFANA_ADMIN_PASSWORD` 32+ случайный, `JWT_SECRET` 64+ base64, ротация при утечке
- `SecurityConfig.java:101` `/actuator/prometheus` `permitAll` локально, в проде `authenticated()` + `basic_auth` или reverse-proxy ACL (не публиковать без auth)
- `GF_SECURITY_ALLOW_EMBEDDING=false`, `GF_USERS_ALLOW_SIGN_UP=false`, `TELEGRAM_ALLOWED_CHAT_IDS` whitelist, `AppProperties` CORS только `https://okututor.com`
- Логи: `RequestCorrelationFilter` → `requestId` в MDC → Loki `level/service/container`, никогда не логировать `password`, `JWT`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`

## 9. Хранение и бэкап

- Volumes: `prometheus_data`, `grafana_data`, `loki_data`, `alertmanager_data` — переживают `down/up`, бэкапь host `/var/lib/docker/volumes/okututor-monitoring_*`
- Retention: `PROMETHEUS_RETENTION=15d`, `LOKI_RETENTION_PERIOD=168h` (`168h` = 7 дней, filesystem TSDB, `compactor.delete_request_store: filesystem`)
- `ops/backup/README.md` → `pg_dump -Fc` Neon nightly + `rclone` на R2, дашборды/rules в Git

## 10. Порты и сети

| Сервис | Порт | Протокол | Сеть | Доступ |
|--------|------|----------|------|--------|
| Grafana | 3000 | http | monitoring (bridge) | наружу через Dokploy domain + HTTPS |
| Prometheus | 9090 | http | monitoring | private |
| Loki | 3100 | http/grpc 9096 | monitoring | private |
| Promtail | 9080 | http | monitoring | private, mounts `/var/lib/docker/containers` + `docker.sock` |
| Alertmanager | 9093 | http | monitoring | private |
| Telegram Bot | 8085 | http | monitoring | private, health `GET /health`, webhook `POST /alert` |
| Backend | 8080 | http | monitoring (external) | наружу `api.okututor.com` |

## 11. Troubleshooting

- `Grafana Login failed` → `monitoring/.env` `GRAFANA_ADMIN_PASSWORD` не совпадает с `grafana_data` volume (пароль пишется только при создании volume) → `docker volume rm okututor-monitoring_grafana_data && docker compose -f monitoring/docker-compose.yml up -d` или `docker exec okututor-grafana grafana cli admin reset-admin-password admin`
- `Prometheus target DOWN 401` → `SecurityConfig` `authenticated()` для `/actuator/prometheus` — для локала `permitAll`, для прода `basic_auth` в `prometheus.yml` или `docker network` `monitoring`
- `Prometheus target DOWN no such host backend:8080` → бек не в сети `monitoring` — `docker network inspect okututor-monitoring_monitoring` должен показывать `okututor-backend`, добавь бек в сеть `monitoring` (`backend/docker-compose.yml:4` `external: true`)
- `Loki No data` / `level` пустой → бек без `jsonlog` (plain text) → `backend/docker-compose.yml:16` `SPRING_PROFILES_ACTIVE=dev,jsonlog` (было `dev`), `loki/api/v1/label/level/values` должен вернуть `INFO,WARN,DEBUG`
- `Datasource prometheus was not found` → `monitoring/grafana/provisioning/datasources/datasources.yml` без `uid` — добавлены `uid: prometheus/loki` (2026-09-17)
- `BUSINESS N/A` → `okututor_*` метрики эмитит `ObservabilityMetrics` только после трафика — `curl http://localhost:8080/api/v1/tutors` и `POST /api/v1/auth/register`, подожди 15s scrape
- `DiskCritical` → `node-exporter` не в `monitoring` (опционально), проверь `htop`/`df -h`
- `Telegram /test` не приходит → `TELEGRAM_BOT_TOKEN` неверный или `TELEGRAM_ALLOWED_CHAT_IDS` не содержит твой `chatId` → `docker logs okututor-telegram-bot --tail 20` → `Access denied`

## 12. Где что лежит (IaC)

```
monitoring/               # единственный источник мониторинга (6 контейнеров)
├── docker-compose.yml    # prometheus+grafana+loki+promtail+alertmanager+telegram-bot (networks: monitoring, volumes: *_data)
├── .env.example          # GRAFANA_*, TELEGRAM_*, PROMETHEUS_RETENTION, BACKEND_SCRAPE_TARGET=backend:8080
├── prometheus/{prometheus.yml,rules/okututor-alerts.yml}  # scrape_interval 15s, job okututor-backend, rules InstanceDown/HighErrorRate
├── grafana/{provisioning/{datasources/datasources.yml (uid: prometheus/loki), dashboards/dashboards.yml}, dashboards/{okututor-overview.json (52 панели), okututor-application.json, okututor-logs.json}}
├── loki/loki-config.yml  # auth_enabled false, storage filesystem, limits retention_period 168h, discover_service_name list
├── promtail/promtail-config.yml  # docker_sd_configs → loki:3100, pipeline json level
└── telegram-bot/{Dockerfile (maven:3.9 + eclipse-temurin:21), pom.xml (Spring Boot 3.5.4, telegrambots 6.9), src/.../OkuTutorBot.java}

backend/                  # Spring Boot 3.5 / Java 21
├── Dockerfile            # multi-stage maven build, eclipse-temurin:21-jre
├── docker-compose.yml    # только backend (external Neon/R2, сеть monitoring, healthcheck /actuator/health), без postgres/redis
├── .env.example          # SPRING_PROFILES_ACTIVE, DB_*, JWT_SECRET, GOOGLE_*, LIVEKIT_*, R2_*, MAIL_*, REDIS_*
└── src/main/java/com/okututor/backend/{security/SecurityConfig.java:101, observability/ObservabilityMetrics.java, search/TutorSearchService.java}

frontend/                 # Vite 7 + React 19, Cloudflare Pages
├── .env.example          # VITE_API_URL=http://localhost:8080 (dev) / /api (prod), VITE_MOCK_MODE=false
└── src/{api, components, pages}

ops/docker/               # legacy prod compose (postgres+redis+backend+frontend) — не используется локально, с Neon
prod-config/              # .env.backend.prod.example, .env.monitoring.prod.example (только .example в git)
docs/                     # зеркало backend/docs/ (20 файлов, канонический backend/docs/ 21 файл)
```

**Правило:** `monitoring/` (1 App) — наблюдает, `backend` (1 контейнер + Neon) — работает, `frontend` (Cloudflare) — отдаёт, `UptimeRobot` — страхует (`https://api.okututor.com/actuator/health/ready` + `https://okututor.com`).

