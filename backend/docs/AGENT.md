# OkuTutor — Agent Rules & Context (Free MVP)

> This file is the single source of truth for AI agents working on OkuTutor. Keep it updated. All changes must respect Free MVP principles: simple, fast, free marketplace, no paid logic.

## 1. Project Context

**OkuTutor** — free marketplace of tutors in Kyrgyzstan (Bishkek, Osh, etc.). Not a full LMS.

**Core flow:** Find tutor → Contact (chat/request) → Schedule → Lesson. No payments in MVP.

**Stack:**
- Backend: Java 21, Spring Boot 3.5.4, PostgreSQL 16/18 (Neon), Flyway, JPA/Hibernate, Redis, JWT, Spring Security, bucket local/R2
- Frontend: Vite + React + TypeScript, TanStack Query, Zustand, React Router, i18next (ru primary, en/ky), tokens.css light/dark via `[data-theme="dark"]`
- Deploy: Docker Compose (postgres, redis, mailpit, backend:8080, frontend:5173/8081)

**User roles:** `USER` (default, can have resume), `ADMIN`, `SUPER_ADMIN`. Legacy `STUDENT`/`TUTOR` mapped to `USER`.

## 2. Resume/Profile Domain (Single Source of Truth)

**Entity:** `backend/src/main/java/com/okututor/backend/tutor/TutorProfile.java` (table `tutor_profiles`)
- Do NOT create duplicate `Resume` entity. `TutorProfile` IS the resume/listing.
- Profile (user) is permanent; Resume (listing) is temporal, linked via `user_id` unique.

**Status enum:** `backend/src/main/java/com/okututor/backend/tutor/TutorProfileStatus.java`
- `DRAFT`, `PENDING_MODERATION`, `PUBLISHED` (=ACTIVE), `REJECTED`, `SUSPENDED`, `EXPIRED` (new), `HIDDEN` (optional)
- `ACTIVE` is not a separate DB value — it is `PUBLISHED` + `expiresAt > now`.
- `EXPIRING` is computed: `0 < expiresAt - now <= 7 days`, not a DB status.

**Fields (audit before adding, use existing naming):**
- `status` (enum, not null)
- `publishedAt` (Instant, UTC, last activation)
- `expiresAt` (Instant, UTC, `publishedAt + 30 days`)
- `lastActiveAt` (Instant, UTC, last confirm)
- Optional: `hiddenAt`, `archivedAt`
- Existing: `createdAt`, `updatedAt`, `viewsCount`, `rejectionReason`, `rating`, `seoTitle`...

**Lifecycle (Free MVP):**
```
DRAFT --submit--> PENDING_MODERATION --admin approve--> PUBLISHED (ACTIVE, expiresAt = now+30d)
ACTIVE --7d before--> EXPIRING (computed) --expiresAt <= now--> EXPIRED (via query filter + scheduled job)
EXPIRED --renew--> ACTIVE (expiresAt = max(now, expiresAt)+30d, publishedAt=now)
ACTIVE --hide--> HIDDEN (hiddenAt=now, not searchable)
HIDDEN --restore--> ACTIVE (if not expired) or DRAFT
ACTIVE --admin suspend--> SUSPENDED
```
- Resume is searchable **only** when `status = PUBLISHED` (or `ACTIVE`) AND `expiresAt > now` AND `user.blocked=false` AND `noindex=false`.
- Never return expired in: `publicListing`, `searchCandidates`, `findPublishedWithFilters`, `findPublishedExcludingBlocked`, `search/api`, `autocomplete`, `SEO listing`.
- Use `expiresAt > now` in **every** search query (critical), not just one endpoint. Add index `(status, expiresAt)`.

**Publication/Renewal:**
- `publishedAt = now`, `expiresAt = max(now, expiresAt) + 30 days` (not `now+30d` stacking), `lastActiveAt = now`, `status = PUBLISHED`. Prevent `expiresAt` overflow (max 1 click = +30d).
- `POST /api/v1/tutors/me/submit` (or `/publish`, `/renew`, `/hide`, `/restore` adapted to `PUT /tutors/me` style) — backend computes dates, **never trust frontend `expiresAt/status`**.
- Anti-spam: `RateLimit` on create/submit, `existsByUserId` (one profile per user), ownership check `profile.getUser().getId().equals(principal.id())`, admin RBAC `@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")`.

**Auto-expiration:**
- Primary: query filter `expiresAt > now` — never rely solely on cron.
- Secondary: scheduled job `ACTIVE + expiresAt <= now -> EXPIRED` every hour, idempotent, no deletes. `UPDATE tutor_profiles SET status='EXPIRED' WHERE status='PUBLISHED' AND expiresAt <= now`.

**Notifications (use existing `NotificationService.java:63`):**
- T-7d: "Ваше резюме скоро перестанет отображаться. Продлите бесплатно."
- T-1d: "Завтра срок размещения закончится."
- T+0: "Резюме скрыто из поиска. Продлите бесплатно."
- Idempotent: `notificationService.existsForEntity()` or `createdAt` dedup, `entityType=RESUME, entityId=profileId`.

**SEO:**
- `Profile` (user) is permanent, always 200.
- `Resume` listing page (`/tutor/{slug}`) when EXPIRED/HIDDEN: keep 200 but show "Временно недоступно", add `<meta name="robots" content="noindex">` via `noindex=true`, exclude from `findPublishedForSitemap`, keep `expiresAt` in JSON-LD.
- Never mass 404.

**Admin:**
- Metrics: `active (PUBLISHED+not expired)`, `expiring (<=7d)`, `expired`, `hidden`, `archived`.
- Actions: view, hide, restore, renew, extend, see `publishedAt/expiresAt/lastActiveAt`, history via `ModerationAction` + `AuditLogService`.

## 3. Search & SEO

- All search queries must include `expiresAt > now`. Check: `TutorProfileRepository.java` (4 queries) + `TutorSearchService.java:134` (native).
- Recommendations/autocomplete: same filter.
- Sitemap: `findPublishedForSitemap` already `PUBLISHED+noindex=false` — add `expiresAt > now`.

## 4. Frontend

- Do not create parallel workflow. Integrate into existing:
  - `PgBecomeTutor.tsx` (wizard 10 steps), `PgTutorDashboard.tsx`, `PgDashboardResume.tsx` (status card), `PgTutorProfile.tsx`, `PgSearch.tsx`, `useDashboardResume` (staleTime 0).
- Single component `ResumeStatusCard` (or adapt existing badge) showing: `Активно до 11 октября 2026` / `Скоро истекает (7д)` / `Истекло` + buttons `Редактировать/Скрыть/Продлить (30д)`.
- API: `POST /tutors/me/submit` (publish), `POST /tutors/me/renew`, `POST /tutors/me/hide`, `POST /tutors/me/restore` — adapt to existing `PUT /tutors/me` style if no new endpoints.
- Never send `expiresAt/status` from frontend as trusted.

## 5. DB & Migrations

- Audit `src/main/resources/db/migration/` V40-V47 before new. New migration `V48__resume_expiry.sql` adds `expires_at timestamptz, last_active_at timestamptz, hidden_at timestamptz` + indexes `(status, expires_at)`, backfill: `UPDATE tutor_profiles SET expires_at = COALESCE(published_at, created_at) + interval '30 days', last_active_at = COALESCE(published_at, updated_at) WHERE status='PUBLISHED' AND expires_at IS NULL`.
- Safe prod migration: not null after backfill, default `now()+30d` for new rows.

## 6. Security & UX

- Permissions: only owner can publish/edit/hide/renew/restore; admin can moderate all. Check `principal.id()` vs `profile.user.id`.
- Frontend must not allow `status/expiresAt` tampering.
- UX: simple, one primary CTA per state, no paywall, unlimited free renewals for now.

## 7. Testing

- Backend: publish, renew, expire, re-publish, ownership, permissions, search active only, scheduler idempotency, UTC boundaries (`expiresAt == now` is expired), `max(now,expiresAt)+30d` no stacking.
- Frontend: ACTIVE/EXPIRING/EXPIRED cards, loading/error, renew success/failure.
- E2E: create -> publish -> search visible -> wait expire -> not in search -> renew -> visible again.

## 8. What NOT to do (Free MVP)

- No Premium/VIP/paid lift/subscription/tariffs.
- No complex rating/availability mandatory.
- No deletion of old resumes.
- No limit on free renewals.

## 9. Agent Workflow

1. Audit domain (entities, repos, services, controllers, search, migrations, notifications, frontend pages).
2. Plan (this file) — no duplicates.
3. Backend (migration + entity + search filter + scheduler + API).
4. Frontend (ResumeStatusCard + dashboard/profile/search).
5. Notifications (T-7, T-1, T+0, idempotent).
6. Admin (metrics + actions).
7. Tests + `mvn clean verify` + `npm run build` + SEO check.
8. Verify existing workflow not regressed.

## 10. File Map

- Backend: `tutor/TutorProfile*`, `search/*`, `legal/*`, `notification/*`, `admin/*`
- Frontend: `pages/PgTutorDashboard`, `PgDashboardResume`, `PgBecomeTutor`, `features/tutors/*`, `api/marketplace/tutorProfileMarketplace.api.ts`
- Migrations: `db/migration/V48__*`
- Tests: `src/test/java/...` + `src/test/k6/api-test.js`

Keep this file updated. For any doubt, prefer simple `expiresAt > now` filter over status-only logic.
