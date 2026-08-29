# Okututor Frontend

React SPA for the Okututor tutoring platform: students find tutors, book lessons and join LiveKit rooms; tutors manage courses, schedule and students; admins moderate applications, courses, reviews and reports.

The production backend is a Java Spring Boot service exposing `/api/v1/*`. Development requires a running backend (mock mode has been removed).

## Stack

- React 19 + Vite 6
- react-router-dom v7 (lazy-loaded routes)
- Zustand (auth state)
- i18next (`ru`, `kg`, `en`)
- livekit-client (lesson rooms)

## Getting started

```bash
npm ci
cp .env.example .env   # Windows: Copy-Item .env.example .env
npm run dev
```

## Environment variables (.env)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:8080` |
| `VITE_MOCK_MODE` | Reserved. Mock mode was removed, so this must stay `false` — the app always talks to a live backend |

Never commit real secrets — `.env` is gitignored.

## Scripts

```bash
npm run dev       # dev server with HMR
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # eslint
npm run test      # vitest unit tests
```

## Architecture overview

See [`docs/FRONTEND_AUDIT.md`](docs/FRONTEND_AUDIT.md) for the full audit (pages, routes, features, gaps).

```
src/
  api/          # single HTTP client + per-domain API modules + endpoints registry
  components/   # shared UI (modals, primitives, navbar/sidebar)
  constants/    # enums shared with the backend contract
  locales/      # ru / kg / en translations
  pages/        # route-level pages (Pg*.jsx), code-split via React.lazy
  store/        # zustand auth store
  styles/       # plain CSS per area
```

Key rules:

- All network calls go through `src/api/http.js`; components never build raw URLs.
- Auth state lives only in `src/store/authStore.js`; access is gated by `ProtectedRoute`.
- On `401` the client refreshes tokens once and replays the original request; on refresh failure it clears state and redirects to `/login`.

### Search

Course search uses the backend smart-search endpoint `GET /api/v1/search/courses`
(FTS ru/en, synonyms like пайтон↔python, ranking) — see `okututor-backend`
`docs/SEARCH_API.md`. It is public (no auth credentials) and returns a snake_case
`PageResponse` (`content`, `total_elements`, `total_pages`). The LIKE-based catalog
`GET /api/v1/courses` is kept only for `popular` / `byId` / tutor CRUD.

For development set `VITE_MOCK_MODE=false` and point `VITE_API_URL` at a live
backend with seeded data; then `?q=python`, `?q=пайтон`, `?q=математика`,
`?q=англис тили` should all return relevant courses.

### Token storage note

Access/refresh tokens are kept in `localStorage` (`src/api/token.js`). This is an accepted MVP trade-off: it keeps the frontend stateless but exposes tokens to any successful XSS. Mitigations: strict dependency review, no `dangerouslySetInnerHTML`. The recommended post-MVP hardening is moving the refresh token to an httpOnly cookie on the backend side.

## Docker

```bash
docker build -t okututor-frontend .
docker run -p 8080:80 okututor-frontend
```

`nginx.conf` includes SPA fallback (`try_files $uri /index.html`), gzip and long-term caching for hashed assets. Deep links like `/course/123` or `/profile` are served by React, not nginx 404.
