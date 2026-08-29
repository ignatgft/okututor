# Frontend Production Readiness Report

## DONE

### Auth Flow
- [x] **401 refresh loop protection** — `_retry` flag prevents infinite loops; refresh endpoint uses `auth=false` so its own 401s don't cascade
- [x] **Single-flight refresh** — `refreshManager.js` deduplicates concurrent refreshes with `isRefreshing` flag + failed queue
- [x] **RefreshManager race condition fix** — flag reset before queue processing prevents hang on narrow timing window
- [x] **Token validation on storage** — `login`/`register` skip storing when `access_token` is undefined (prevents `"undefined"` strings)
- [x] **setTokens clears stale values** — passing `null` removes the old token instead of silently leaving a stale one
- [x] **areTokensConsistent** — requires both tokens or neither; rejects access-without-refresh mismatches
- [x] **Response parser** — catches `JSON.parse` errors on non-JSON error pages from proxies
- [x] **ProtectedRoute loading timeout** — 10s timeout with retry button instead of infinite spinner
- [x] **Logout cleanup** — `apiLogout()` + `clearTokens()` + store reset (redundant clear is harmless)
- [x] **Dead code removal** — removed duplicate `refreshTokens()` from `auth.js` (conflicted with `refreshManager`)

### Search & Filters
- [x] **Text search debounce** — 600ms debounce on text input; form submit bypasses debounce
- [x] **AbortController** — outdated requests cancelled on new fetch
- [x] **URL state sync** — all filters (q, subject, location_type, group_size, days, price, rating, sort, page) synced to URL
- [x] **URL hydration** — filters restored from URL on page load (deep-linkable)
- [x] **syncUrl moved out of state updater** — pure state updater; URL sync in separate useEffect
- [x] **Price debounce** — `onBlur` instead of `onChange` (prevents 3 API calls for "150")
- [x] **Pagination** — `<Pagination>` component with `aria-current="page"` and prev/next buttons
- [x] **totalResults from API** — accurate count from `totalElements` field instead of `courses.length`
- [x] **Empty state** — `<EmptyState>` with reset-all button when active filters produce no results
- [x] **Error state** — `<ErrorState>` with retry button
- [x] **Loading state** — `<Spinner>` during fetch

### Accessibility
- [x] **Skip-nav link** — `<a href="#main-content" className="skip-nav">`
- [x] **CardCourse keyboard** — `tabIndex={0}`, `role="link"`, `onKeyDown` for Enter/Space
- [x] **ConfirmModal focus trap** — Tab cycles within modal; Escape dismisses; confirm button auto-focused
- [x] **ReviewModal focus trap** — Tab cycles; Escape dismisses; body scroll lock; submit auto-focused
- [x] **Star rating (search filters)** — `role="radio"`, `tabIndex={0}`, `onKeyDown`, `aria-checked`
- [x] **Star rating (review modal)** — `aria-checked` instead of `aria-pressed` inside `role="radiogroup"`
- [x] **Toast error announcements** — `aria-live="assertive"` + `role="alert"` for error toasts
- [x] **EmptyState** — `role="status"` for screen reader announcement
- [x] **Decorative stars** — `aria-hidden="true"` on card star rating container
- [x] **Filter overlay backdrop** — `onKeyDown` for Escape dismissal
- [x] **Filter toggle button** — `aria-expanded` + `aria-controls` pointing to panel ID
- [x] **SearchInput** — `type="search"` + `autoComplete="off"`
- [x] **Price inputs** — `min="0"`, translated `aria-label` and `placeholder`

### Layout & Navigation
- [x] **3 role-based layouts** — `StudentLayout`, `TutorLayout`, `AdminLayout` with nested `<Outlet>`
- [x] **Persistent sidebar** — renders on all breakpoints (mobile drawer, tablet collapsed, desktop full)
- [x] **BottomNav mobile-only** — `<768px` with `aria-current="page"` on active tab
- [x] **Page title context** — dynamic mobile header titles via `usePageTitle()` hook
- [x] **Responsive design** — mobile-first with `--page-padding`, `--section-gap`, `--card-padding` tokens
- [x] **Safe area insets** — `env(safe-area-inset-*)` for notched phones
- [x] **z-index scale** — `--z-base:0` through `--z-toast:600`

### Error Handling
- [x] **`normalizeApiError`** — maps HTTP status to stable error codes (NETWORK, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION, CONFLICT, RATE_LIMIT, SERVER, TIMEOUT)
- [x] **`ApiRequestError`** — transport-layer errors with `code`, `fieldErrors`, `retryable` properties
- [x] **Network detection** — offline errors get `NETWORK_ERROR` code
- [x] **401 custom event** — `window.dispatchEvent(new CustomEvent("auth:logout"))` triggers store logout
- [x] **ErrorBoundary** — catches render errors with fallback UI

### Forms
- [x] **Client validation** — required fields, email format, password min 8 chars, password match
- [x] **Loading states** — submit buttons show translated loading text during async operations
- [x] **Inline error display** — `role="alert"` on error paragraphs

### Performance
- [x] **Lazy loading** — all page components wrapped in `React.lazy()` with `Suspense`
- [x] **Avatar lazy loading** — `loading="lazy"` on CardCourse avatar images
- [x] **30s request timeout** — prevents hung requests
- [x] **CSS variables** — shared design tokens for consistency and theming
- [x] **Dark mode** — theme toggle in sidebar with localStorage persistence

### Internationalization
- [x] **3 languages** — English (`en`), Russian (`ru`), Kyrgyz (`ky`)
- [x] **Fallback strings** — all `t()` calls include English fallback
- [x] **Locale-aware dates** — `Intl.DateTimeFormat` with detected locale

---

## PARTIAL

### Search UX
- [ ] **No minimum query length** — single-character searches fire API requests (consider 2-3 char minimum)
- [ ] **Pagination windowing** — all page buttons rendered even for 100+ pages (no ellipsis/window)
- [ ] **Sort/fire-and-forget** — select filters fire immediately (acceptable but inconsistent with price blur pattern)
- [ ] **No totalCount from all API shapes** — array fallback uses heuristic for `totalPages`

### Loading States
- [ ] **Skeleton loading** — `<Skeleton>` component exists but `<Spinner>` used everywhere (skeleton would improve perceived performance)
- [ ] **ProtectedRoute loading** — shows bare "Loading..." text (no spinner animation)

### Forms
- [ ] **No rate limiting** — login form has no client-side attempt counter
- [ ] **No field-level errors** — `fieldErrors` from `normalizeApiError` not surfaced in form UI
- [ ] **Price input validation** — no max bounds, no positive-only enforcement beyond `min="0"`

---

## TODO (BLOCKED or DEFERRED)

### Backend-Dependent
- [ ] **HttpOnly cookie migration** — refresh token should move from `localStorage` to HttpOnly cookie (BLOCK: backend change)
- [ ] **CSP headers** — Content-Security-Policy needs backend/proxy configuration
- [ ] **POST /auth/resend-reset-code** — `resendResetCode` falls back to `resendVerification` (BLOCK: missing endpoint)
- [ ] **Server-side session revocation** — no mechanism to detect backend account blocking without page reload
- [ ] **Bookings API module** — `bookings.api.js` does not exist; endpoints defined in `endpoints.js` but no dedicated module

### Missing Features
- [ ] **Pagination on messages/notifications/lessons** — all load at once (fine for MVP, blocks at scale)
- [ ] **Focus trap library** — current focus traps are hand-rolled (consider `focus-trap-react` for robustness)
- [ ] **Toast pause-on-hover** — toasts auto-dismiss even when user is reading them
- [ ] **Review modal** — uses `reviewsApi.createForBooking()` but no optimistic update
- [ ] **Search result cache** — no stale-while-revalidate or SWR pattern

---

## UX RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Refresh token in localStorage (XSS target) | **HIGH** | MVP trade-off; HttpOnly cookie migration planned |
| No focus trap library (hand-rolled) | **MEDIUM** | Works for current modals; may break with dynamic content |
| No infinite scroll / virtualization | **MEDIUM** | Pagination works; degrades with 100+ pages |
| Toasts don't pause on hover | **LOW** | Default durations (4-6s) usually sufficient |
| No skeleton loading (spinner only) | **LOW** | Functionally correct; perceived performance lower |

---

## TECHNICAL RISKS

| Risk | Severity | Details |
|------|----------|---------|
| 540KB PgLesson chunk | **MEDIUM** | LiveKit dependency; consider code-splitting LiveKit separately |
| 430KB index.js main bundle | **MEDIUM** | Contains React + React Router + Zustand; acceptable for SPA |
| No service worker / offline | **LOW** | MVP scope; SPA requires network |
| No E2E tests | **LOW** | Unit tests cover auth/search/modal logic; E2E would catch integration issues |

---

## BUILD STATUS

- **Build**: ✅ passes (`npm run build`)
- **Lint**: ✅ 0 errors, 1 warning (react-refresh/only-export-components in Toast.jsx — acceptable)
- **Tests**: ✅ 19/19 passing

---

## FILES MODIFIED IN THIS SESSION

| File | Changes |
|------|---------|
| `src/api/auth.js` | Removed dead `refreshTokens()`, fixed token validation, static import for logout |
| `src/api/token.js` | Fixed `areTokensConsistent()`, fixed `setTokens()` to clear on null |
| `src/api/client/refreshManager.js` | Fixed race condition (flag reset before queue processing) |
| `src/api/client/responseParser.js` | Added JSON parse error handling |
| `src/components/ProtectedRoute.jsx` | Added 10s loading timeout with retry |
| `src/hooks/useCourseSearch.js` | Moved syncUrl out of updater, added totalResults, cleanup on unmount |
| `src/constants/search.js` | Moved subject from LIST to SCALAR fields |
| `src/components/SearchComp/SearchBar.jsx` | Added aria-controls, keyboard backdrop dismiss, totalResults |
| `src/components/SearchComp/SearchFilters.jsx` | Star a11y, price onBlur, translated aria-labels |
| `src/components/SearchComp/SearchInput.jsx` | type=search, autoComplete=off |
| `src/components/CardCourse.jsx` | Keyboard support, lazy avatar, decorative stars aria-hidden |
| `src/components/ui/ConfirmModal.jsx` | Focus trap, translated loading text |
| `src/components/ui/ReviewModal.jsx` | Focus trap, Escape, scroll lock, reviewsApi, aria-checked |
| `src/components/ui/Primitives.jsx` | EmptyState role=status |
| `src/components/ui/Toast.jsx` | Error toasts aria-live=assertive, role=alert |
| `src/api/token.test.js` | Updated test for new setTokens behavior |
| `src/store/authStore.test.js` | Added refresh_token to test fixture |
