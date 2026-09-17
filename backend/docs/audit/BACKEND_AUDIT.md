# BACKEND_AUDIT — 2026-09-16

См. полный отчет в explore-логе (50 JPA репо, 59 Flyway, TutorProfile 10 статусов, search FTS, chat 2 системы).

## Резюме
- Resume `TutorProfile` production-ready (create→submit→approve→publish→expiry→renew/hide/archive)
- Search: TutorSearchService рулит (candidateLimit 300, hard filters в SQL, total via count, sort в SQL)
- Chat: marketplace `chat` изолирован, legacy `messaging` остался

## Работает
- Auth JWT 15m + refresh 30d rotation, Google OAuth code flow, rate-limit LocalRateLimiter
- R2 proxy private files `messages/*` auth, MediaService immutable keys

## Частично
- `education` vs `educationJson` дубль, `TutorProfileMedia` не используется
- Candidate limit truncation при глубокой пагинации

## Legacy
- `course/enrollment/booking/lesson/schedule` — EdTech, не трогать без dependency map

## Missing
- WebSocket, second-gen ranking, consent reconsent automation

## Files to change
- `TutorProfileRepository.java:136` search SQL
- `TutorSearchService.java:91` pagination
- `ChatService.java` attachment support
