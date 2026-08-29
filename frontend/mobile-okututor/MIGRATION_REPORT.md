# Okututor Mobile Migration Report

Native (Expo + React Native) port of the Okututor web frontend. Target: SDK 57 /
Expo Router, React 19, TypeScript strict, Zustand state, i18next, single Spring
Boot backend.

## Current status

All quality gates pass on this codebase:

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Lint | `npm run lint` (eslint-config-expo, flat config) | 0 problems |
| Unit tests | `npm test` (vitest, node env) | 6 files / 38 tests pass |
| Web bundle | `npx expo export --platform web` | exports all routes |

Install with `npm install`, then run with `npm start` (Expo Go) or `npm run web`.

## Screen coverage

- **Auth**: login, register (role select + Google via `expo-web-browser` +
  `mobileokututor://oauth/callback`), verify-email, forgot/reset password (OTP
  component), oauth callback route. `app/(auth)/`.
- **Tabs** (`app/(tabs)/`): home (popular courses), search (debounced,
  abortable), courses (student enrollments / tutor courses), calendar (month
  grid + range fetch), messages (unified conversations), dashboard (tutor
  requests + accept/accept&schedule), profile. Role-based tab hiding via
  `href: null`. Unread badge polled into `notificationStore`.
- **Stack screens**: `course/[id]` (enroll request/cancel, reviews, can-review
  gating, edit/delete for owner, "Book a lesson" → booking/new), `tutor/[id]`
  (profile + courses + contact chips), `booking/new` (14-day picker, generated
  slots from tutor availability, 30/60/90/120 min), `booking/[id]` (confirm /
  reject / cancel / complete, join lesson), `lesson/[id]` (booking info,
  meeting token vía `POST /api/v1/meetings/{id}/token`, join/leave),
  `notifications`, `chat/[id]` (polling, optimistic send, support threads via
  `support-<id>` ids), `course-form` (create/edit with draft + submit),
  `support` (ticket list + create), `admin` (stats + quick actions).
- **UI kit** (`src/components/ui`): Button, Input, Select, Badge (+
  `toneForStatus`), Card, EmptyState, ConfirmDialog, IconButton, Skeleton*/Error,
  Screen/ScrollScreen, ScreenHeader, Toast context.

## Architecture decisions

- **API layer** mirrors the web contract 1:1 (`src/api/{http, auth, courses,
  booking, lessons, tutors, messages, search, calendar, admin, support}.ts` +
  shared `endpoints.ts`), sharing the web's refresh-token orchestration
  (`refreshManager`), timeout signal, and 401 handling.
- **Strictness fixes vs. web**: `canReview` shape `{ eligible, has_attended,
  already_reviewed }`; meeting token is `POST`; notifications return
  `MaybePaginated<AppNotification>`; `ConversationType` enum (`DIRECT` /
  `SUPPORT` / `SYSTEM`).
- **State**: `authStore` is the source of truth for the user; `userStore`
  handles profile mutations and syncs back; `notificationStore` owns unread
  count; `useApi` hook normalizes every fetch into
  `{ data, loading, error, refetch }`.
- **Theme**: light/dark/system via `ThemeProvider` (AsyncStorage-persisted).
- **i18n**: en/ru/kg, `lng` persisted, fallback `en`; `statusLabels` maps API
  statuses → i18n keys (typed around i18next `TFunction`).
- **Compiler**: `reactCompiler: false` in app.json; the new react-hooks lint
  rules (refs-in-render, set-state-in-effect) are satisfied in code (deferred
  `setTimeout` effects) or scoped `eslint-disable` where intentional.

## Known deviations / remaining work

1. **Native LiveKit not integrated** — `lesson/[id]` fetches the token and
   opens `booking.meeting_url` via `Linking`; embedding a native video room is
   future work. `expo-video`/LiveKit native packages are not installed.
2. **Admin moderation screens** — users/tutors/courses/reviews/reports exist as
   "quick actions" (`/admin/*`) but the actual sub-screens are web-only.
3. **Push** — device-token fetch exists (`src/services/notifications.ts`, Expo
   push tokens, guarded for web), but backend device-token registration and
   scheduled reminders are not wired up.
4. **Rich content** — course descriptions are plain text; web's rich-text
   editor and image upload were not ported (backend fields pass through).
5. **Assistant chat** — the AI-assistant flow is not part of the mobile scope.
6. **OAuth provider config** — the backend must allow the
   `mobileokututor://oauth/callback` redirect URI before Google sign-in works on
   device.
7. **Build tooling** — `eas.json` is not present; native builds/credentials and
   EAS push project id still need configuration for store/deploy builds.
8. **Fit & finish** — password-manager autofill, haptics and deep-link edge
   cases in Expo Go are only partially testable without a dev build.

## Notes

- `npx expo install` is unreliable in this environment (broken `cross-spawn`);
  packages were installed via `npm install` against
  `node_modules/expo/bundledNativeModules.json` versions.
- Lint added in this pass (`eslint` + `eslint-config-expo/flat` + `vitest`);
  config lives in `eslint.config.js` and `vitest.config.ts`.