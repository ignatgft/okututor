# Backup & Restore

## Что бэкапить

- `pgdata` — `pg_dump -Fc okututor > okututor_$(date +%F).dump` nightly cron 02:00 UTC, retention 7/30
- `uploads` — `tar czf uploads_$(date).tgz /app/data`
- `grafana_data / loki_data / prometheus_data` — snapshot volume

## Verify

Ежемесячно: `pg_restore --clean` на стейдже + `SELECT count(*) FROM tutor_profiles`.

## Retention

- Prometheus 30d (`--storage.tsdb.retention.time=30d`)
- Loki 30d (`retention_period: 720h`)
- Tempo 7d
- Audit logs — дольше (PostgreSQL, не Loki)
