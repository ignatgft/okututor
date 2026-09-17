# SECURITY_FINAL_AUDIT — OkuTutor 2026-09-16

## Проверки (15)

1. **USER→ADMIN** — `SecurityConfig` + `@PreAuthorize(SUPER_ADMIN)` для legal/telegram, `AdminController` `requireAdmin` — PASS
2. **USER→admin API** — `anyRequest().authenticated()` + `401` — PASS (проверено `AdminGuardTest`)
3. **Admin→SUPER_ADMIN** — `AdminTgController` `SUPER_ADMIN` only, `changeRole` `requireSuperAdmin` — PASS
4. **Resume владелец** — `TutorProfileService` `userId.equals` + `blocked` check — PASS
5. **Published нельзя редактировать** — `update` `DELETED/ARCHIVED` → 404, `PUBLISHED` + `isModerationRequired` → `PENDING` — PASS
6. **Chat только участники** — `ChatService` `involves` + `blocked` — PASS
7. **Legal publish только SUPER_ADMIN** — `@PreAuthorize` + `translate` — PASS
8. **Скачать чужие private files** — `MediaFileController.isPrivateKey` + `authenticated` — PASS
9. **XSS Legal editor** — `LegalService.sanitize` `Jsoup Safelist.basicWithImages` + `TutorProfileService.sanitize` `Safelist.none` — PASS
10. **Arbitrary executable upload** — `MediaService` whitelist `image/jpeg/png/webp/gif, pdf`, `STORAGE_PROVIDER` R2, `contentType` check — PASS
11. **Secrets в Git** — `prod-config/*.prod` gitignored, `ProdEnvValidator` fail-fast, `backend/.env` ignored — PASS (но `R2 prod-config` еще `DB_HOST=postgres` — WARN, должен быть Neon)
12. **Production errors не раскрывают stack** — `GlobalExceptionHandler` `500 INTERNAL_ERROR` + `traceId` — PASS
13. **Tokens не в логах** — `sanitize` email, `logback` не логирует `Authorization` — PASS
14. **Rate limits** — `RateLimitService` `LocalRateLimiter` sliding window `login 10/m, tutor-request 5/m, storage 10/m` — PASS (per-instance, Redis optional)
15. **Refresh token flow** — `RefreshTokenRotationService` `family+grace 30s` + `reuse → revokeFamily` — PASS

## Вывод

**PASS 15/15**, `WARN` — `frontend token sessionStorage` (HttpOnly flag false) — backend `Set-Cookie` не реализован, XSS окно 15m.

**Файлы:** `SecurityConfig.java:26`, `JwtService`, `RefreshTokenRotationService`, `RateLimitService.java:39`, `MediaFileController.java:28`, `LegalService.java:174`
