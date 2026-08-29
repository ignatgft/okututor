# Okututor Frontend — Production Readiness

**Last updated:** 2026-08-25

## Build & Deploy

```bash
npm install          # install dependencies
npm run lint         # 0 errors, 1 pre-existing warning (Toast.jsx react-refresh)
npm run test         # 19/19 tests pass
npx vite build       # production build → dist/
```

## Architecture

| Layer | Status |
|-------|--------|
| Routes | 40+ routes via React Router v6, lazy-loaded |
| Roles | `ROLES` constants (STUDENT / TUTOR / ADMIN / SUPER_ADMIN) via `src/constants/roles.js` |
| Permissions | Granular permission system via `hasPermission(role, permission)` |
| Conversations | Unified hub: DIRECT + SUPPORT + SYSTEM types |
| API | Domain-split modules (`auth.api.js`, `users.api.js`, etc.) + barrel export (`api/index.js`) |
| Error handling | `ApiRequestError` with code, fieldErrors, retryable |
| Mobile | Slide-in drawer nav, safe-area BottomNav, 44px touch targets |
| i18n | 3 locales (en / ru / kg) via react-i18next |
| Design tokens | CSS custom properties via `tokens.css` (light/dark) |

## Role Hierarchy

```
STUDENT < TUTOR < ADMIN < SUPER_ADMIN
```

- ADMIN cannot assign ADMIN or SUPER_ADMIN
- SUPER_ADMIN can manage admins, system settings, and audit
- All role checks use `ROLES` constants, never hardcoded strings

## Key Files

| Purpose | Path |
|---------|------|
| Roles & permissions | `src/constants/roles.js` |
| Enums & backward-compat | `src/constants/enums.js` |
| API barrel export | `src/api/index.js` |
| Error abstraction | `src/api/client/errorMapper.js` |
| HTTP client | `src/api/http.js` |
| Auth flow | `src/api/auth.js` + `src/api/auth.api.js` |
| Messages hub | `src/pages/PgMessages.jsx` |
| Support API | `src/api/support.api.js` |
| Design tokens | `src/styles/tokens.css` |
| Environment vars | `.env.example` |

## Production Checklist

- [x] Role constants (no hardcoded strings)
- [x] Permission system
- [x] SUPER_ADMIN role
- [x] Unified Messages hub (support integrated)
- [x] Mobile navigation (drawer, safe-area, touch targets)
- [x] API error abstraction (retryable, fieldErrors)
- [x] API barrel export
- [x] Design token compliance (no hardcoded colors)
- [x] i18n for all user-facing text
- [x] Responsive layouts (mobile / tablet / desktop)
- [x] .env.example with all variables
- [ ] WebSocket realtime (deferred — needs backend WS support)
- [ ] Analytics events (deferred)
- [ ] Dynamic SEO metadata (deferred)
- [ ] Accessibility audit (deferred — basic ARIA in place)

## Performance Notes

- Lazy-loaded pages reduce initial bundle
- `PgLesson` bundle is 540 KB (livekit-client) — consider dynamic import of LiveKit
- `PgMain` bundle is 34 KB — acceptable for landing page
## Known Limitations

1. `PgMessages` uses REST polling (5s interval) until WebSocket is available
2. `PgNotifications` has static display — needs backend integration
3. `PgSettings` has hardcoded "Email notifications: Enabled"
4. Google OAuth flow stores tokens in URL — should migrate to HttpOnly cookies
5. No CSRF protection — relying on Bearer tokens
6. No input sanitization on message bodies (relies on backend)
