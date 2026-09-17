# OkuTutor — Runbook (что делать при падении)

## Backend DOWN
- Проверить `https://api.okututor.kg/actuator/health` (403 ожидается без auth, 200 с токеном) и `systemctl status okututor` на VPS#2
- Логи: `docker logs okututor-backend --tail 200` или Loki ` {app="backend"} |= "ERROR" `
- Метрики: Grafana `Backend` → `http_server_requests_seconds_count` 5xx spike
- Действие: `dokploy restart backend` → если не помогло `git revert` + `dokploy deploy` предыдущий образ, проверить NeonDB `select 1`

## VPS#2 DOWN
- Внешний uptime монитор → Telegram `ApplicationNodeDown`
- SSH: `ssh root@vps2 "docker ps"` → если недоступен, проверить Hetzner/Dokploy консоль
- Перезапуск: `reboot` → `dokploy` автозапуск, проверить `Node Exporter` на VPS#1 (отсутствие метрик = VPS#2 down)

## Neon DOWN
- Backend лог `HikariPool - Connection is not available` + `FATAL: database`
- Действие: проверить Neon dashboard, `psql` direct, проверить `DB_HOST` env, fallback — нет (PostgreSQL только Neon)

## Redis DOWN
- Лог `Cache get error ... Unable to connect to Redis` (WARN, не ERROR — `CacheErrorHandler` подавляет)
- Действие: `redis-cli ping` на VPS#2, если нет Redis — работает fallback `ConcurrentMapCacheManager` (in-memory), проверить `app.rate-limit.use-redis=false` для дев

## Cloudflare / Frontend
- Проверка `curl -I https://okututor.kg` → `cf-cache-status`
- Действие: Cloudflare dashboard → Purge Cache, проверить `nginx.conf` CSP (убрать `unsafe-eval`)

## R2
- Проверка `MediaService` лог `R2 upload failed`
- Действие: проверить `R2_*` env, `r2.cloudflarestorage.com` доступ, fallback `STORAGE_PROVIDER=local`

## Monitoring DOWN (VPS#1)
- Проверка `http://vps1:3000` Grafana, `9090` Prometheus
- Действие: `docker compose -f ops/monitoring/docker-compose.yml restart`, проверить `Loki` volume, `Alertmanager` → Telegram `MonitoringProblem`

## Telegram Alerts
- Критичные: `BackendDown`, `DatabaseUnavailable`, `High5xxRate`, `DiskCritical` → немедленный `dokploy rollback`
- Варнинги: `HighCPU`, `HighMemory` → проверить `htop`, `docker stats`

## Сертификаты
- Cloudflare SSL → Auto, проверить `https://` expiry, `dokploy` LetsEncrypt для `api.*`
