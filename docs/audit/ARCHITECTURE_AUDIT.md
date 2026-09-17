# ARCHITECTURE_AUDIT — OkuTutor 2026-09-16

> Marketplace резюме: `User (USER) -> Resume (TutorProfile) -> Moderation -> Published` + Search + Contact/Chat + Legal

## Решение
- **Monorepo** `backend/` (Spring Boot 3.5/Java21, single jar) + `frontend/` (Vite React) + `metrics/` (VPS#1) + `ops/` (VPS#2 app)
- **2 VPS:** VPS#1 Monitoring (Prometheus/Grafana/Loki/Tempo/Alertmanager/Alloy/NodeExporter), VPS#2 App (Backend + NodeExporter + Alloy), Cloudflare Pages/CDN/WAF/R2, Neon PG (managed)
- **Монолит backend** пакеты, не Maven-модули; `common/` (AppProperties, Cache, Security, RateLimit, ErrorHandler)

## Что реализовано / работает
- Resume core: TutorProfile 10 статусов, TutorRequest→Chat, Search FTS+trgm+synonym, Legal 5 docs, Chat 2 системы, R2 proxy

## Частично / Сломано
- 2 профиля пакетов `tutor` vs `tutors` (дубль), 3 workflow `enrollment/booking/lesson` legacy + marketplace, 2 чата `messaging` vs `chat`
- VPS#2 `docker-compose.prod.yml` еще гоняет postgres+redis+frontend (противоречит Neon/Cloudflare доке), `ops/monitoring` дублирует `metrics/`

## Legacy / Дубли / Отсутствует
- Legacy: `course`, `enrollment`, `booking`, `lesson`, `schedule`, `tutors/TutorApplication`, `StudentRoutes/TutorRoutes`
- Дубль: `chat` vs `messaging`, `tutor` vs `tutors`, `search` vs `CourseSearch`
- Отсутствует: WebSocket chat, unified ranking, file virus scan

## Файлы к изменению
- `backend/src/main/java/com/okututor/backend/tutor/*` vs `tutors/*` схлопнуть
- `metrics/` сделать единственным источником мониторинга, удалить `ops/monitoring`

## Приоритеты
- P0: разделить monitoring/application ноды, убрать redis если не нужен
- P1: схлопнуть legacy, унифицировать поиск
