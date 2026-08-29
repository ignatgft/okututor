# Frontend Architecture

> Companion to `FRONTEND_AUDIT.md` (feature coverage). This file describes the technical structure after the MVP refactor (Aug 2026).

## Stack

React 19 · Vite 6 · react-router-dom v7 · zustand 5 · i18next · livekit-client · vitest.

## Directory map

```
src/
├── api/               # network layer (single HTTP client, no raw fetch in UI)
│   ├── http.js        # apiClient facade: auth header, 401 refresh queue
│   ├── token.js       # access/refresh persistence (localStorage)
│   ├── config.js      # API base URL from env
│   ├── endpoints.js   # central URL registry (/api/v1/*)
│   └── *.api.js       # domain modules: auth, users, tutors, students,
│                      # courses, lessons, reviews, messages(+notifications), admin
├── components/
│   ├── AuthRegister/  # Auth modal/page, Register, shared Modal
│   ├── HomeSection/   # landing sections (hero, categories, tutors, footer…)
│   ├── SearchComp/    # SearchBar (URL-synced filters, sort, pagination)
│   ├── ui/            # Primitives (Badge/Spinner/Skeleton/EmptyState/ErrorState),
│   │                  # ConfirmModal, ReasonModal, Pagination
│   ├── ProtectedRoute.jsx  # role guard (roles=[...]), redirects /login
│   ├── ErrorBoundary.jsx   # top-level render-error catcher
│   ├── Sidebar.jsx / BottomNav.jsx / Navbar.jsx / DashboardLayout.jsx
│   └── CourseView.jsx, CourseWizard.jsx, Profile.jsx, TutorProfileContent.jsx …
├── constants/enums.js # statuses shared with backend contract (ROLES, *_STATUS)
├── hooks/useTheme.js
├── locales/{en,ru,kg}/translation.json
├── pages/Pg*.jsx      # route-level pages, ALL lazy-loaded via React.lazy+Suspense
├── store/authStore.js # zustand: user/isAuthenticated/loading + init/login/logout
└── styles/            # plain CSS per area (no CSS-in-JS, no preprocessor)
```

## Data flow

```
Page (Pg*.jsx)
  → domain api module (*.api.js)      [builds URL from endpoints.js]
    → apiClient.request()             [http.js]
      → fetch + Authorization header
      → 401 → refresh queue → replay once (_retry flag)
      → refresh fail → clear tokens → redirect /login
  ← { response, data }
  → local page state → loading/error/empty/success UI states
```

Rules:

- Components never call `fetch` directly and never hardcode URLs.
- Server errors surface through `ErrorState` / inline messages, never raw stack traces.
- Every async loader is wrapped in `useCallback` with correct deps (lint-enforced).

## Routing

Defined in `App.jsx`. Groups:

| Group | Guard | Routes |
| --- | --- | --- |
| Public | — | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/oauth/callback`, `/search`, `/course/:id`, `/tutor/:id` |
| Student | `ProtectedRoute roles=["STUDENT"]` | `/student/{dashboard,courses,tutors,requests,schedule,lessons,messages,notifications,progress,profile,settings}` |
| Tutor | `ProtectedRoute roles=["TUTOR","ADMIN"]` | `/tutor/{application,dashboard,courses,courses/new,courses/edit/:id,students,schedule,lessons,messages,notifications,profile,settings}`, `/become-tutor` |
| Shared | authenticated | `/lesson/:bookingId` |
| Admin | `ProtectedRoute roles=["ADMIN"]` | `/admin/{users,tutors,courses,reviews,reports,profile,settings}` |
| Legacy | role redirect | `/dashboard`, `/profile`, `/schedule`, `/messages`, `/progress`, `/settings`, `/course*` |
| Fallback | — | `*` → `PgNotFound` (404) |

## State management

- **Client/global:** zustand (`authStore`: user, isAuthenticated, loading; theme hook).
- **Server data:** kept in page-local state; no global server cache yet (see TECH_DEBT).
- **URL state:** search filters/sort/pagination synced to query params; tutor dashboard tab via `?tab=`.

## Auth lifecycle

1. App mount → `authStore.init()` → if token present, `GET /users/me`.
2. Any request 401 → single-flight refresh (`POST /auth/refresh`) → original request replayed.
3. Refresh failure → tokens cleared → `window.location = "/login"`.

## Testing

Vitest + jsdom + Testing Library. Coverage today: refresh flow concurrency/retry/failure (`http.test.js`), auth store init/logout (`authStore.test.js`), route guard behavior (`ProtectedRoute.test.jsx`). Run: `npm run test`.

## Build/deploy

Vite build → `dist/`; Dockerfile (node:20 build stage → nginx:alpine); nginx.conf provides SPA fallback, gzip, hashed-asset caching, `/api` proxy to Spring Boot.
