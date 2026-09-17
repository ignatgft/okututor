# SECURITY_AUDIT — 2026-09-16 (P0->P2 уже пофикшены)

- JWT HS256 15m + refresh 30d rotation + family grace 30s ✅
- ProdEnvValidator fail-fast (JWT/CORS/LIVEKIT) ✅
- RBAC USER/ADMIN/SUPER_ADMIN + legacy mapping ✅
- RateLimit Local sliding window (per-instance) ✅
- OAuth code flow (не token в URL) ✅
- ClientIpResolver trusted proxy ✅
- SecurityHeaders CSP/HSTS divergent nginx vs backend — выровнять
- Frontend token sessionStorage (HttpOnly flag false) — backend Set-Cookie не реализован
- Prometheus auth commented — 401 на scrape
- Осталось: HttpOnly refresh cookie, R2 length check, ProdEnvValidator R2/REDIS

Files: SecurityConfig.java, JwtService, RefreshTokenRotation, RateLimitService, ClientIpResolver
