# OkuTutor — Архитектура

**Дата:** 2026-09-16
**Статус:** Production Ready (после рефакторинга)

## Обзор
OkuTutor = marketplace резюме репетиторов в Кыргызстане (не LMS). Любой USER создает резюме → модерация → публикация → обращения.

## Роли
- USER (базовая)
- ADMIN
- SUPER_ADMIN (legal, cookies, infra)

Бизнес-роль tutor удалена (см. LEGACY_EDTECH.md).

## Инфраструктура (зафиксирована)
- Cloudflare: frontend, DNS/CDN/WAF, R2
- **Monitoring: `monitoring/` — 1 Dokploy Application `okututor-monitoring` = Prometheus + Grafana + Loki + Promtail + Alertmanager + Telegram Bot (6 контейнеров, сеть monitoring, volumes persistent, без Tempo/Alloy/Redis/min)**
- Backend: Spring Boot 3.5 / Java 21 (Neon, Hikari, Micrometer Prometheus, jsonlog)
- NeonDB PostgreSQL (не на VPS)
- Redis удалён (rate-limit = `LocalRateLimiter` in-memory)
- - Frontend/DB не на VPS; `metrics/` удалена → `monitoring/`

## Бекенд (Spring Boot)
- Auth: JWT access 15m / refresh 30d + grace 30s, Google OAuth via `OAuthLoginSuccessHandler` → `code` → `/auth/oauth/exchange` (HttpOnly, без Referer утечки)
- Security: `SecurityConfig` STATELESS, `JwtAuthenticationFilter`, `RateLimitService` (sliding-window, Redis или Local), `SecurityHeadersFilter`, `LegacyApiGuard` (410/Deprecation)
- Domain: `TutorProfile` (41 поле, state machine DRAFT→PUBLISHED…), `TutorRequest` → `Conversation` → `Message`
- Search: `TutorSearchService` (FTS ru/en + trgm + synonym regex, candidateLimit 300, сортировка в SQL, кеш `tutorSearch` 45s)
- Legal: `LegalDocument`/`LegalDocumentVersion` (DRAFT/PUBLISHED/ARCHIVED, одна PUBLISHED per type+lang, Jsoup sanitization)
- R2: `MediaService` + `R2ObjectStorage`/`LocalFileStorage`, `MediaObject` метаданные, `AppProperties.storage`
- Observability: `monitoring/` → Prometheus (RED/JVM/Hikari/`okututor_*` business) + Loki (Promtail Docker logs) → Grafana (provisioning), Alertmanager → telegram-bot → Telegram; `RequestCorrelationFilter` → `requestId` (MDC), `logback jsonlog`

## Фронтенд (React 19 + Vite 7)
- `Navbar` (моб drawer TutorKG + тёмная тема pure black #000), `Sidebar` (user/admin, collapsible, dark #000)
- `Category` — 10 карточек (Математика…ОРТ) с градиентными SVG, 5-кол desktop
- Search: `useTutorSearch` (debounce 450ms, AbortController, `syncUrl`+`fetch` объединены)
- Chat: единый `chat.api.ts` + `useMessagingThread` (poll 5s, visibilityState throttle)
- Legal: `DOMPurify` для `dangerouslySetInnerHTML`

## База
- Flyway V1..V60, Neon PostgreSQL 18.6, `open-in-view=false`
- Индексы: `pg_trgm` для FTS, `search_vector_ru/search_vector`

## CI/CD
- GitHub Actions: lint → test → build → security → merge → Dokploy → healthcheck → rollback
- Env: `SPRING_PROFILES_ACTIVE=dev/prod`, секреты в GitHub/Dokploy Secrets, не в Git

## Связи
Frontend → Cloudflare → Backend (8080) → NeonDB/R2/Redis → VPS#1 observability
