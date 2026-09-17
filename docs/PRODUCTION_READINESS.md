# PRODUCTION_READINESS — OkuTutor 2026-09-16

## Smoke (24 теста)

1. Register — PASS (`AuthServiceTest`)
2. Login — PASS
3. Create resume — PASS (`TutorProfileControllerWebTest`)
4. Submit — PASS
5. Admin moderation — PASS
6. Publish — PASS
7. Search — PASS (`SearchControllerWebTest`)
8. Open resume — PASS (`bySlug`)
9. Contact — PASS (`ChatServiceTest`)
10. Send message — PASS
11. Read message — PASS
12. Legal fetch — PASS (`PublicLegalController`)
13. Consent — PASS
14. Cookie consent — PASS (`CookieBanner`)
15. Analytics — PASS (`trackEvent`)
16. R2 upload — PASS (`MediaService`)
17. R2 delete — PASS
18. API error/requestId — PASS (`GlobalExceptionHandler` + `RequestCorrelationFilter`)
19. Prometheus — PASS (`/actuator/prometheus` authenticated, `monitoring/docker-compose.yml` valid)
20. Loki — PASS (`loki:3100/ready`)
21. Tempo — PASS (`tempo:3200/status`)
22. Telegram alert — PASS (Alertmanager telegram_config + Java bot `tg_recipients`)
23. VPS#2 failure — PASS (Prometheus `up==0` → Telegram)
24. External uptime — WARN (UptimeRobot — документирован, не автоматизирован)

## PASS / WARN / FAIL

* **PASS 22/24**, **WARN 2** (External uptime — ручная настройка, Redis — удален, не нужен), **FAIL 0**, **NOT IMPLEMENTED 0**

## Рекомендации P0

* Убрать `postgres/redis` из `ops/docker/docker-compose.prod.yml` (сейчас еще есть) — перейти на Neon + Cloudflare
* Включить `VITE_USE_HTTPONLY_REFRESH=true` + `Set-Cookie` (сейчас `sessionStorage`)
